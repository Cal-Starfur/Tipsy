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
 *  the daily board's key, these never rotate, so a user's best run ever
 *  stays ranked regardless of when it happened. */
const ALLTIME_KEY = 'tipsy:global:board:alltime'
const ALLTIME_AVATAR_KEY = 'tipsy:global:avatars:alltime'

async function dbGetTopFromKey(
  key: string,
  avatarsKey: string,
  n: number,
): Promise<LeaderboardEntry[]> {
  const rows = await redis.zRange(key, 0, n - 1, {by: 'rank', reverse: true})
  if (rows.length === 0) return []
  const usernames = rows.map(r => r.member)
  const avatars = await redis.hMGet(avatarsKey, usernames)
  return rows.map((r, i) => {
    const {tipCents, ms} = decodeScore(r.score)
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
  return dbGetTopFromKey(leaderboardKey(dateStr), avatarKey(dateStr), n)
}

export async function dbGetAllTimeTop(n: number): Promise<LeaderboardEntry[]> {
  return dbGetTopFromKey(ALLTIME_KEY, ALLTIME_AVATAR_KEY, n)
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
 *  The snoovatar is only looked up (and only overwrites the cache) when
 *  this submission actually becomes that user's new best for today —
 *  not on every attempt — since it's an extra Reddit API call.
 *
 *  The daily and all-time boards are updated independently in the same
 *  call: a run can be this user's new daily best without being their
 *  all-time best (or vice versa, on a day they don't beat an old
 *  personal record), so each is checked and written on its own rather
 *  than assuming one implies the other. */
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
  const allTimeBetter =
    allTimeCurrent === undefined || newScore > allTimeCurrent

  if (dailyBetter || allTimeBetter) {
    const url = await reddit.getSnoovatarUrl(username).catch(() => undefined)
    if (dailyBetter) {
      await redis.zAdd(dailyKey, {member: username, score: newScore})
      if (url) await redis.hSet(avatarKey(dateStr), {[username]: url})
      await redis.expire(dailyKey, DAILY_TTL_SECONDS)
      await redis.expire(avatarKey(dateStr), DAILY_TTL_SECONDS)
    }
    if (allTimeBetter) {
      await redis.zAdd(ALLTIME_KEY, {member: username, score: newScore})
      if (url) await redis.hSet(ALLTIME_AVATAR_KEY, {[username]: url})
    }
  }

  const [daily, allTime] = await Promise.all([
    dbGetTop(dateStr, 10),
    dbGetAllTimeTop(10),
  ])
  return {daily, allTime}
}

/** One-time (safe to re-run) utility: copies every entry on today's
 *  board into the all-time board wherever it's better than what's
 *  already there. Exists to backfill all-time after it was added
 *  mid-day, so runs that happened before the feature existed aren't
 *  lost. Reads the full daily board, not just the top 10, so nobody
 *  who played today is skipped. Re-running is harmless — an entry
 *  only ever gets overwritten if it's actually an improvement. */
export async function dbBackfillAllTimeFromDate(
  dateStr: string,
): Promise<{merged: number; total: number}> {
  const dailyKey = leaderboardKey(dateStr)
  const rows = await redis.zRange(dailyKey, 0, -1, {by: 'rank', reverse: true})
  if (rows.length === 0) return {merged: 0, total: 0}

  const usernames = rows.map(r => r.member)
  const avatars = await redis.hMGet(avatarKey(dateStr), usernames)

  let merged = 0
  for (const [i, row] of rows.entries()) {
    const allTimeCurrent = await redis.zScore(ALLTIME_KEY, row.member)
    if (allTimeCurrent === undefined || row.score > allTimeCurrent) {
      await redis.zAdd(ALLTIME_KEY, {member: row.member, score: row.score})
      const url = avatars[i]
      if (url) await redis.hSet(ALLTIME_AVATAR_KEY, {[row.member]: url})
      merged++
    }
  }
  return {merged, total: rows.length}
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

