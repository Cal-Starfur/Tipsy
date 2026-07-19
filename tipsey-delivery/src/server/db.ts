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

export async function dbGetTop(dateStr: string, n: number): Promise<LeaderboardEntry[]> {
  const rows = await redis.zRange(leaderboardKey(dateStr), 0, n - 1, {by: 'rank', reverse: true})
  if (rows.length === 0) return []
  const usernames = rows.map(r => r.member)
  const avatars = await redis.hMGet(avatarKey(dateStr), usernames)
  return rows.map((r, i) => {
    const {tipCents, ms} = decodeScore(r.score)
    return {username: r.member, tip: tipCents / 100, ms, avatarUrl: avatars[i] ?? null}
  })
}

export async function dbGetDailyBest(dateStr: string): Promise<DailyBest> {
  const top = await dbGetTop(dateStr, 1)
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
 *  not on every attempt — since it's an extra Reddit API call. */
export async function dbSubmitScore(
  dateStr: string,
  tip: number,
  ms: number,
  username: string,
): Promise<LeaderboardEntry[]> {
  const tipCents = Math.round(tip * 100)
  const newScore = encodeScore(tipCents, ms)
  const key = leaderboardKey(dateStr)
  const current = await redis.zScore(key, username)
  const better = current === undefined || newScore > current
  if (better) {
    await redis.zAdd(key, {member: username, score: newScore})
    const url = await reddit.getSnoovatarUrl(username).catch(() => undefined)
    if (url) await redis.hSet(avatarKey(dateStr), {[username]: url})
  }
  return dbGetTop(dateStr, 10)
}
