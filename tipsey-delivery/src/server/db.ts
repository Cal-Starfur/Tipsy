import {reddit, redis} from '@devvit/web/server'
import type {DailyBest, LeaderboardEntry} from '../shared/api.ts'

/** Today's date, UTC, "YYYY-MM-DD" — matches the client's own
 *  `new Date().toISOString().slice(0,10)` exactly (see requestDailyBest()
 *  in game/index.html). The server computes this itself rather than
 *  trusting a client-supplied date; see the tipsyBridge comment in
 *  game/index.html for why. */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Redis sorted-set scores are a single number, but ranking needs two
 *  fields (tip desc, then time asc as tiebreak — matching the local
 *  leaderboard convention). Encode both into one score: tip dominates
 *  since the multiplier comfortably exceeds any plausible ms value for
 *  this game (well under a minute per run), and the bounded remainder
 *  term means a faster time produces a higher score at equal tips.
 *  Adding a bounded remainder (rather than subtracting ms directly)
 *  is what makes floor-division decode back to the exact tipCents —
 *  subtracting let ms push the value into the next tipCents bucket
 *  down, silently corrupting both fields on decode. */
const SCORE_MULT = 10_000_000

/** Daily boards are never explicitly deleted (Redis on Devvit can't list
 *  keys, so a deleted user's entry on an old day's board can't be found
 *  and purged directly — see dbRemoveUser). Auto-expiring each daily key
 *  30 days after it's last written closes that gap on its own, matching
 *  Reddit's own recommended retention window for stored user data. */
const DAILY_TTL_SECONDS = 30 * 24 * 60 * 60

function encodeScore(tipCents: number, ms: number): number {
  return tipCents * SCORE_MULT + (SCORE_MULT - 1 - ms)
}

function decodeScore(score: number): {tipCents: number; ms: number} {
  const tipCents = Math.floor(score / SCORE_MULT)
  const remainder = score - tipCents * SCORE_MULT
  const ms = SCORE_MULT - 1 - remainder
  return {tipCents, ms}
}

function leaderboardKey(dateStr: string): string {
  return `tipsy:global:board:${dateStr}`
}

function avatarKey(dateStr: string): string {
  return `tipsy:global:avatars:${dateStr}`
}

/** All-time board is a single pair of keys, never date-scoped — unlike
 *  the daily board's key, these never rotate. Score is a running
 *  cumulative total of every tip a player has ever earned (see
 *  dbSubmitScore), not a best-single-run comparison like the daily
 *  board — so someone who plays often outranks someone who only had
 *  one great run. */
const ALLTIME_KEY = 'tipsy:global:board:alltime'
const ALLTIME_AVATAR_KEY = 'tipsy:global:avatars:alltime'

async function dbGetTopFromKey(
  key: string,
  avatarsKey: string,
  n: number,
  decode: (score: number) => {tipCents: number; ms: number},
): Promise<LeaderboardEntry[]> {
  const rows = await redis.zRange(key, 0, n - 1, {by: 'rank', reverse: true})
  if (rows.length === 0) return []
  const usernames = rows.map(r => r.member)
  const avatars = await redis.hMGet(avatarsKey, usernames)
  return rows.map((r, i) => {
    const {tipCents, ms} = decode(r.score)
    return {
      username: r.member,
      tip: tipCents / 100,
      ms,
      avatarUrl: avatars[i] ?? null,
    }
  })
}

export async function dbGetTop(
  dateStr: string,
  n: number,
): Promise<LeaderboardEntry[]> {
  return dbGetTopFromKey(
    leaderboardKey(dateStr),
    avatarKey(dateStr),
    n,
    decodeScore,
  )
}

/** All-time scores are a plain cumulative cent total (see dbSubmitScore),
 *  not the tip+time encoding the daily board uses — there's no per-run
 *  time to decode out of a running sum, so ms is always 0 here. Decoding
 *  an all-time score with the daily decodeScore() would silently read
 *  back as $0.00 for any real total (it divides by the 10,000,000
 *  multiplier meant for single-run scores), so this needs its own decode. */
export async function dbGetAllTimeTop(n: number): Promise<LeaderboardEntry[]> {
  return dbGetTopFromKey(ALLTIME_KEY, ALLTIME_AVATAR_KEY, n, score => ({
    tipCents: score,
    ms: 0,
  }))
}

export async function dbGetDailyBest(dateStr: string): Promise<DailyBest> {
  const top = await dbGetTop(dateStr, 1)
  const first = top[0]
  return first ? {tip: first.tip, ms: first.ms, username: first.username} : null
}

export async function dbGetAllTimeBest(): Promise<DailyBest> {
  const top = await dbGetAllTimeTop(1)
  const first = top[0]
  return first ? {tip: first.tip, ms: first.ms, username: first.username} : null
}

/** Re-verifies against Redis (source of truth) rather than trusting the
 *  caller's own "better than what I last saw" check, so two players
 *  finishing close together can't both think they set the record and
 *  overwrite each other with a worse one. Only one entry per user is
 *  kept per day (their best) — a plain zAdd would overwrite regardless
 *  of direction, so the current score is fetched and compared first.
 *
 *  The all-time board is a running total, not a best-run comparison —
 *  every completed delivery adds its tip via zIncrBy, unconditionally,
 *  so a player who plays often climbs the board over time rather than
 *  needing one lucky run. Daily and all-time are otherwise independent:
 *  a run can be this user's new daily best without changing their
 *  all-time rank much at all, and vice versa.
 *
 *  The snoovatar is only looked up (and only written) when it'll
 *  actually be used for the first time: a new daily best (existing
 *  rule), or this user's first-ever appearance on the all-time board
 *  (their avatar isn't cached there yet) — not on every attempt, since
 *  it's an extra Reddit API call and snoovatars rarely change. */
export async function dbSubmitScore(
  dateStr: string,
  tip: number,
  ms: number,
  username: string,
): Promise<{daily: LeaderboardEntry[]; allTime: LeaderboardEntry[]}> {
  const tipCents = Math.round(tip * 100)
  const newScore = encodeScore(tipCents, ms)
  const dailyKey = leaderboardKey(dateStr)

  const [dailyCurrent, allTimeCurrent] = await Promise.all([
    redis.zScore(dailyKey, username),
    redis.zScore(ALLTIME_KEY, username),
  ])
  const dailyBetter = dailyCurrent === undefined || newScore > dailyCurrent
  const isFirstAllTimeAppearance = allTimeCurrent === undefined

  if (dailyBetter || isFirstAllTimeAppearance) {
    const url = await reddit.getSnoovatarUrl(username).catch(() => undefined)
    if (dailyBetter) {
      await redis.zAdd(dailyKey, {member: username, score: newScore})
      if (url) await redis.hSet(avatarKey(dateStr), {[username]: url})
      await redis.expire(dailyKey, DAILY_TTL_SECONDS)
      await redis.expire(avatarKey(dateStr), DAILY_TTL_SECONDS)
    }
    if (isFirstAllTimeAppearance && url) {
      await redis.hSet(ALLTIME_AVATAR_KEY, {[username]: url})
    }
  }

  // Every completed delivery contributes to the cumulative total,
  // regardless of whether it was a personal best.
  await redis.zIncrBy(ALLTIME_KEY, username, tipCents)

  const [daily, allTime] = await Promise.all([
    dbGetTop(dateStr, 10),
    dbGetAllTimeTop(10),
  ])
  return {daily, allTime}
}

const ALLTIME_CUMULATIVE_MIGRATION_KEY =
  'tipsy:global:board:alltime:migrated-cumulative'

/** One-time (safe to re-run) migration: the all-time board used to store
 *  each player's single best-ever run (tip+time encoded together, see
 *  encodeScore). It's now a running cumulative total instead (see
 *  dbSubmitScore), so every existing entry needs rewriting from "best
 *  run" to "current total" — seeded from that best run, since real
 *  per-run history was never recorded and can't be reconstructed.
 *  Claimed via the same nx-set pattern as the daily-post and
 *  weekly-sweep checks (see dbShouldPostDaily) so a second click on the
 *  admin menu can't re-seed anyone and silently double their total. */
export async function dbMigrateAllTimeToCumulative(): Promise<{
  migrated: number
  alreadyRan: boolean
}> {
  const claimed = await redis.set(ALLTIME_CUMULATIVE_MIGRATION_KEY, '1', {
    nx: true,
  })
  if (claimed === null) return {migrated: 0, alreadyRan: true}

  const rows = await redis.zRange(ALLTIME_KEY, 0, -1, {by: 'rank'})
  for (const row of rows) {
    const {tipCents} = decodeScore(row.score)
    await redis.zAdd(ALLTIME_KEY, {member: row.member, score: tipCents})
  }
  return {migrated: rows.length, alreadyRan: false}
}

/** Handles AccountDelete: strips the user from every board this app can
 *  actually still reach — today's daily board and the permanent all-time
 *  board. Past days' boards can't be targeted directly (no key listing
 *  on Devvit Redis; see DAILY_TTL_SECONDS above for how those expire on
 *  their own instead). */
export async function dbRemoveUser(username: string): Promise<void> {
  const dateStr = todayUTC()
  await Promise.all([
    redis.zRem(leaderboardKey(dateStr), [username]),
    redis.hDel(avatarKey(dateStr), [username]),
    redis.zRem(ALLTIME_KEY, [username]),
    redis.hDel(ALLTIME_AVATAR_KEY, [username]),
  ])
}

/** "YYYY-MM-DD" in America/New_York, not UTC — deliberately separate
 *  from todayUTC() (which the route/leaderboard day boundary still
 *  uses, untouched). Intl's timeZone handling resolves real IANA
 *  daylight-saving transitions automatically, so this doesn't drift
 *  across the DST switch the way a fixed UTC-offset cron would. */
function todayET(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Current hour in America/New_York, 0-23, DST-correct for the same
 *  reason as todayET(). */
function currentHourET(): number {
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  }).format(new Date())
  // "24" shows up at midnight with hour12:false in some environments;
  // normalize it to 0 rather than trust the raw string.
  const h = parseInt(hourStr, 10)
  return h === 24 ? 0 : h
}

const DAILY_POST_CLAIM_PREFIX = 'tipsy:global:dailypost:claim:'
const DAILY_POST_ID_KEY = 'tipsy:global:dailypost:id'

/** Should the scheduled 6am-ET check actually post right now? Checks
 *  the real ET wall-clock hour (not just "did the cron fire" — the
 *  cron runs every 15 minutes all day so the server itself decides
 *  the actual moment), then atomically claims today's ET date so the
 *  four checks that land inside the 6am hour only ever result in one
 *  post, however many times this endpoint gets hit. */
export async function dbShouldPostDaily(): Promise<boolean> {
  if (currentHourET() !== 6) return false
  const dateStr = todayET()
  const tomorrow = new Date(Date.now() + 26 * 60 * 60 * 1000) // generous — this key only needs to outlive today
  const claimed = await redis.set(DAILY_POST_CLAIM_PREFIX + dateStr, '1', {
    nx: true,
    expiration: tomorrow,
  })
  return claimed !== null
}

export async function dbGetDailyPostId(): Promise<string | null> {
  const id = await redis.get(DAILY_POST_ID_KEY)
  return id ?? null
}

export async function dbSetDailyPostId(id: string): Promise<void> {
  await redis.set(DAILY_POST_ID_KEY, id)
}

const SWEEP_CLAIM_PREFIX = 'tipsy:global:sweep:claim:'

/** One claim slot per week (Unix-epoch-week number, not calendar-week —
 *  doesn't need to line up with any particular day, just needs to be
 *  stable and change roughly weekly). Defensive insurance in case the
 *  weekly cron fires more than once around its scheduled time; the
 *  actual cadence is set by the cron itself (devvit.json), not by
 *  this key. */
function currentWeekKey(): string {
  return String(Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)))
}

export async function dbShouldRunWeeklySweep(): Promise<boolean> {
  const key = SWEEP_CLAIM_PREFIX + currentWeekKey()
  const expiration = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000) // 8 days — generous, just needs to outlive this week
  const claimed = await redis.set(key, '1', {nx: true, expiration})
  return claimed !== null
}

/** Compliance sweep: reddit.getCurrentUser() can't tell us when an
 *  account is deleted (Devvit's AccountDelete trigger isn't supported
 *  in this app's generation), so this actively checks instead. Every
 *  username currently on today's board or the permanent all-time
 *  board (not just the visible top 10 — the full membership) gets
 *  verified against Reddit; anyone who no longer resolves is purged
 *  via dbRemoveUser, the same function the (unreachable) delete
 *  trigger was always going to call. userExists is injected rather
 *  than imported so db.ts stays Redis-only and the Reddit API call
 *  lives in server.ts, matching how the rest of this file is split. */
export async function dbSweepDeletedUsers(
  userExists: (username: string) => Promise<boolean>,
): Promise<{checked: number; removed: number}> {
  const dateStr = todayUTC()
  const [dailyRows, allTimeRows] = await Promise.all([
    redis.zRange(leaderboardKey(dateStr), 0, -1, {by: 'rank'}),
    redis.zRange(ALLTIME_KEY, 0, -1, {by: 'rank'}),
  ])
  const usernames = [
    ...new Set([...dailyRows, ...allTimeRows].map(r => r.member)),
  ]

  let removed = 0
  for (const username of usernames) {
    let exists = true
    try {
      exists = await userExists(username)
    } catch (err) {
      console.error(`dbSweepDeletedUsers: check failed for ${username}`, err)
      continue // don't remove on an inconclusive check — err toward keeping data over a network hiccup
    }
    if (!exists) {
      await dbRemoveUser(username)
      removed++
    }
  }
  return {checked: usernames.length, removed}
}
