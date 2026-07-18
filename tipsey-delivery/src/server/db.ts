import {redis} from '@devvit/web/server'
import type {T3} from '@devvit/web/shared'
import type {DailyBest} from '../shared/api.ts'

export async function dbGetCounter(t3: T3): Promise<number> {
  return Number((await redis.get(counterKey(t3))) ?? 0)
}

export async function dbIncCounter(t3: T3, amount: number): Promise<number> {
  return redis.incrBy(counterKey(t3), amount)
}

function counterKey(t3: T3): string {
  return `count:${t3}`
}

/** Today's date, UTC, "YYYY-MM-DD" — matches the client's own
 *  `new Date().toISOString().slice(0,10)` exactly (see requestDailyBest()
 *  in game/index.html). The server computes this itself rather than
 *  trusting a client-supplied date; see the tipsyBridge comment in
 *  game/index.html for why. */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function dbGetDailyBest(dateStr: string): Promise<DailyBest> {
  const raw = await redis.get(dailyBestKey(dateStr))
  return raw ? (JSON.parse(raw) as DailyBest) : null
}

/** Re-verifies against Redis (source of truth) rather than trusting the
 *  caller's own "better than what I last saw" check, so two players
 *  finishing close together can't both think they set the record and
 *  overwrite each other with a worse one. Returns the record that ends
 *  up stored — either the new one, or the existing one if it was
 *  already better. */
export async function dbSetDailyBestIfBetter(
  dateStr: string,
  tip: number,
  ms: number,
  username: string,
): Promise<DailyBest> {
  const current = await dbGetDailyBest(dateStr)
  const better = !current || tip > current.tip || (tip === current.tip && ms < current.ms)
  if (!better) return current
  const record: DailyBest = {tip, ms, username}
  await redis.set(dailyBestKey(dateStr), JSON.stringify(record))
  return record
}

function dailyBestKey(dateStr: string): string {
  return `tipsy:global:best:${dateStr}`
}
