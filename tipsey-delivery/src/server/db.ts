import {reddit, redis} from '@devvit/web/server'
import type {DailyBest, LeaderboardEntry, TpProfileRsp} from '../shared/api.ts'
import {
  TS_CLAIMABLE_TROPHIES,
  TS_MISSIONS,
  TS_SKINS,
  type TsMissionState,
} from './tpcatalog.ts'

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

/** Count of deliveries started on ONE date, across every player. Per-day
 *  rather than lifetime: the splash sits beside today's route and
 *  today's leaderboard, so a lifetime number would be the only thing on
 *  the card not talking about today. Carries the same TTL as the daily
 *  boards, so an old day's tally ages out with the board it belongs to. */
/** Which milestone comments we've already posted for a user. Needed
 *  because dbClaimTrophyReward is deliberately idempotent (see its
 *  note: granting an owned skin twice is a no-op, so there's no claimed
 *  ledger) -- which means a replayed claim would otherwise post a fresh
 *  "unlocked!" comment every time it was called. Purchases don't need
 *  this (dbPurchaseSkin rejects an already-owned skin), but they're
 *  routed through it anyway so one guard covers every milestone and the
 *  next one added can't forget.
 *
 *  No TTL: this tracks a permanent fact about a permanent unlock, the
 *  same lifetime as tpOwnedKey, and is cleared with the rest of a
 *  user's data by dbRemoveUser. */
function announcedKey(username: string): string {
  return `tipsy:announced:${username}`
}

/** True the FIRST time a given event is seen for a user, false after.
 *  Read-then-write rather than an atomic set-if-absent: two truly
 *  simultaneous claims could both read empty and both announce, and a
 *  duplicate comment in that hairline race is a cosmetically worse
 *  outcome than nothing, not a correctness problem -- no reward hangs
 *  off this, only copy. */
export async function dbMarkAnnounced(
  username: string,
  event: string,
): Promise<boolean> {
  const key = announcedKey(username)
  const seen = await redis.hGet(key, event)
  if (seen) return false
  await redis.hSet(key, {[event]: '1'})
  return true
}

function playsKey(dateStr: string): string {
  return `tipsy:global:plays:${dateStr}`
}

/** Increments and returns the new count for that date. INCRBY is atomic,
 *  so parallel starts can't lose a count to a read-modify-write race.
 *  The TTL is refreshed on every increment, matching how dbSubmitScore
 *  keeps the daily board alive -- cheap, and it means a date's counter
 *  can never outlive or predecease its leaderboard. */
export async function dbIncrPlays(dateStr: string): Promise<number> {
  const key = playsKey(dateStr)
  const n = await redis.incrBy(key, 1)
  await redis.expire(key, DAILY_TTL_SECONDS)
  return n
}

/** 0 before anyone has pressed GO on that date (key absent). */
export async function dbGetPlays(dateStr: string): Promise<number> {
  const raw = await redis.get(playsKey(dateStr))
  const n = raw ? Number(raw) : 0
  return Number.isFinite(n) ? n : 0
}

function leaderboardKey(dateStr: string): string {
  return `tipsy:global:board:${dateStr}`
}

function avatarKey(dateStr: string): string {
  return `tipsy:global:avatars:${dateStr}`
}

/** Permanent per-user record of their best {tipCents, ms} for every day
 *  they've ever completed — independent of the daily board's 30-day
 *  TTL (DAILY_TTL_SECONDS above). This is the source of truth for the
 *  Past Routes list (game/index.html's requestHistory) and for replay
 *  eligibility + the all-time delta in dbSubmitReplayScore below; it is
 *  NOT read from the daily board, which can expire out from under an
 *  old date long before this should. */
function historyKey(username: string): string {
  return `tipsy:global:history:${username}`
}

/** All-time board is a single pair of keys, never date-scoped — unlike
 *  the daily board's key, these never rotate. Score is a running
 *  cumulative total of every tip a player has ever earned (see
 *  dbSubmitScore), not a best-single-run comparison like the daily
 *  board — so someone who plays often outranks someone who only had
 *  one great run. */
const ALLTIME_KEY = 'tipsy:global:board:alltime'
const ALLTIME_AVATAR_KEY = 'tipsy:global:avatars:alltime'

/** Spendable wallet + equipped skin, as a single hash -- deliberately
 *  NOT folded into ALLTIME_KEY's score. ALLTIME_KEY is the immutable
 *  lifetime-earnings figure the leaderboard reads and must never go
 *  down; walletCents is spendable and does go down (dbPurchaseSkin),
 *  so the two numbers diverge the moment a player buys anything and
 *  can never share a key. hIncrBy on the walletCents field is what
 *  makes dbPurchaseSkin's deduct-then-refund-if-negative pattern
 *  atomic without a read-check-write race; see that function. */
function tpProfileKey(username: string): string {
  return `tipsy:global:tpprofile:${username}`
}
/** One hash field per owned skinId, value always '1' -- presence is the
 *  signal, not the value, which is what makes granting a skin (hSet on
 *  its own field) safe to call twice: the second call just overwrites
 *  '1' with '1'. 'classic' is never written here; it's free and
 *  implicitly owned by every player, so dbGetTpProfile adds it back on
 *  every read instead of paying for a field on every single user. */
function tpOwnedKey(username: string): string {
  return `tipsy:global:tpowned:${username}`
}

/** One hash field per side mission, value = the best count recorded.
 *  Sibling of tpProfileKey/tpOwnedKey and shares their lifetime: a
 *  cleared mission is a permanent fact about a player, not a daily
 *  one, so no TTL. */
function tpMissionsKey(username: string): string {
  return `tipsy:global:tpmissions:${username}`
}

export async function dbGetMissions(username: string): Promise<TsMissionState> {
  const raw = await redis.hGetAll(tpMissionsKey(username))
  const out: TsMissionState = {}
  for (const [id, v] of Object.entries(raw ?? {})) {
    const n = parseInt(String(v), 10)
    if (Number.isFinite(n) && n > 0) out[id] = n
  }
  return out
}

/** Records a side-mission result, keeping the HIGH-WATER mark: reports
 *  arrive after every cleared jump, and a later run that ends at jump 3
 *  must not erase a previous ten.
 *
 *  What this is and isn't: the count is self-reported. The server never
 *  simulated the jumps and has no way to re-derive them, so this is a
 *  durable RECORD, not a proof. Two things bound the damage -- the id
 *  must exist in TS_MISSIONS (so progress can't be banked on a course
 *  that isn't built), and the count is clamped to bestMax (so a forged
 *  report can claim at most what a real clear could have earned). The
 *  only thing riding on it is a cosmetic skin.
 *
 *  firstCompletion is true on the single call that crosses completeAt,
 *  which is what the announce comment hangs off; every later report of
 *  an already-complete mission returns false. */
export async function dbRecordMission(
  username: string,
  missionId: string,
  best: number,
): Promise<
  | {ok: true; best: number; completed: boolean; firstCompletion: boolean}
  | {ok: false; error: string}
> {
  const def = TS_MISSIONS[missionId]
  if (!def) return {ok: false, error: `${missionId} is not a recordable mission`}
  const raw = typeof best === 'number' ? Math.floor(best) : Number.NaN
  if (!Number.isFinite(raw) || raw < 1) {
    return {ok: false, error: 'best must be a positive whole number'}
  }
  const capped = Math.min(def.bestMax, raw)

  const key = tpMissionsKey(username)
  const prev = parseInt((await redis.hGet(key, missionId)) ?? '0', 10) || 0
  const next = Math.max(prev, capped)
  if (next !== prev) await redis.hSet(key, {[missionId]: String(next)})

  const completed = next >= def.completeAt
  return {
    ok: true,
    best: next,
    completed,
    firstCompletion: completed && prev < def.completeAt,
  }
}

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
 *  multiplier meant for single-run scores), so this needs its own decode.
 *
 *  This is not hypothetical: a one-time migration once ran decodeScore()
 *  across the whole all-time board on the assumption it was still in the
 *  old best-run encoding, floored every real total to zero, and wrote
 *  the zeros back over every member. The board had to be reset from
 *  scratch — the values were unrecoverable. NEVER put an all-time score
 *  through decodeScore(); the two key families do not share a format. */
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

/** Every day this user has ever completed, most recent first, plus
 *  their current all-time total (so the Past Routes header can show
 *  it without a second round trip). Corrupt/unparseable entries are
 *  skipped rather than thrown on — defensive only, nothing in this
 *  file is expected to write a bad value here. */
export async function dbGetHistory(
  username: string,
): Promise<{history: {dateStr: string; tip: number; ms: number}[]; allTimeTotal: number}> {
  const [raw, allTimeScore] = await Promise.all([
    redis.hGetAll(historyKey(username)),
    redis.zScore(ALLTIME_KEY, username),
  ])
  const history = Object.entries(raw)
    .map(([dateStr, json]) => {
      try {
        const {tipCents, ms} = JSON.parse(json) as {tipCents: number; ms: number}
        return {dateStr, tip: tipCents / 100, ms}
      } catch {
        return null
      }
    })
    .filter((e): e is {dateStr: string; tip: number; ms: number} => e !== null)
    .sort((a, b) => b.dateStr.localeCompare(a.dateStr))
  return {history, allTimeTotal: (allTimeScore ?? 0) / 100}
}

/** Wallet + owned skins + equipped skin for the Tipsy Profile trophy
 *  case / store (Phase B). 'classic' is added back into `owned` on
 *  every read since it's never persisted (see tpOwnedKey) -- it's free
 *  and everyone has it. Two parallel reads, not a shared key, since
 *  tpProfileKey (scalar fields) and tpOwnedKey (one field per skin) are
 *  different shapes for different reasons -- see each key fn's comment. */
export async function dbGetTpProfile(username: string): Promise<TpProfileRsp> {
  const [profile, ownedRaw, missions] = await Promise.all([
    redis.hGetAll(tpProfileKey(username)),
    redis.hGetAll(tpOwnedKey(username)),
    dbGetMissions(username),
  ])
  const walletCents = parseInt(profile.walletCents ?? '0', 10) || 0
  const equipped = profile.equipped || 'classic'
  /* missions ships on the profile rather than its own endpoint so a
     player who cleared the course on their phone sees the trophy card
     filled in on desktop -- the client merges this into its local
     missionsCompleted/hjBest on every requestTpProfile. */
  return {
    walletCents,
    owned: ['classic', ...Object.keys(ownedRaw)],
    equipped,
    missions,
  }
}

/** Server-authoritative skin purchase. Price/unlockType come from this
 *  file's own TS_SKINS catalog (tpcatalog.ts), never from the client.
 *
 *  The wallet deduction is a single hIncrBy with a NEGATIVE delta,
 *  applied unconditionally -- rather than reading the balance, checking
 *  it, then writing. hIncrBy still drives the field negative if the
 *  price exceeds the balance, and returns that (wrong) new value, so
 *  the check happens AFTER the atomic write: if it went negative,
 *  refund with the opposite hIncrBy and fail. Two concurrent purchase
 *  attempts against a balance that can only cover one of them can't
 *  both pass a stale read the way a get-then-set would -- at most one
 *  nets a non-negative result; the other sees negative and self-heals
 *  via the refund.
 *
 *  Ownership is a single hSet on the skin's own field in tpOwnedKey --
 *  no read first (see that key's comment on why this is safe to call
 *  twice), so a client retry after a dropped response can't double-add
 *  or double-charge (the wallet debit already happened exactly once
 *  per actual call; a genuine duplicate *request* would still charge
 *  twice, but that's a network-retry problem, not a race -- same
 *  exposure any real payment endpoint has without an idempotency key,
 *  and out of scope for this pass). Purchasing auto-equips, matching
 *  the client's own buy-button behavior in game/index.html. */
export async function dbPurchaseSkin(
  username: string,
  skinId: string,
): Promise<{ok: true; profile: TpProfileRsp} | {ok: false; error: string}> {
  const skin = TS_SKINS[skinId]
  if (!skin) return {ok: false, error: `unknown skin: ${skinId}`}
  if (skin.unlockType !== 'purchase') {
    return {ok: false, error: `${skinId} is not purchasable`}
  }
  const key = tpProfileKey(username)
  const newBalance = await redis.hIncrBy(key, 'walletCents', -skin.priceCents)
  if (newBalance < 0) {
    await redis.hIncrBy(key, 'walletCents', skin.priceCents) // refund
    return {ok: false, error: 'insufficient funds'}
  }
  await redis.hSet(tpOwnedKey(username), {[skinId]: '1'})
  await redis.hSet(key, {equipped: skinId})
  return {ok: true, profile: await dbGetTpProfile(username)}
}

/** Equip only checks ownership, never price/unlockType. A skin already
 *  present in tpOwnedKey got there through a path that already
 *  validated it (dbPurchaseSkin or dbClaimTrophyReward below), so
 *  re-deriving eligibility here would just repeat that check for no
 *  reason. 'classic' is always a valid target -- it's implicitly owned
 *  by everyone (see tpOwnedKey) and never has its own field to check. */
export async function dbEquipSkin(
  username: string,
  skinId: string,
): Promise<{ok: true; equipped: string} | {ok: false; error: string}> {
  if (skinId !== 'classic') {
    const owned = await redis.hGet(tpOwnedKey(username), skinId)
    if (owned === undefined) return {ok: false, error: `${skinId} not owned`}
  }
  await redis.hSet(tpProfileKey(username), {equipped: skinId})
  return {ok: true, equipped: skinId}
}

/** Re-derives trophy eligibility from this same file's dbGetHistory --
 *  never trusts a client claim of "I unlocked it." Only trophies in
 *  TS_CLAIMABLE_TROPHIES (tpcatalog.ts) can be claimed this way; see
 *  that file for why hydrant-hop/slalom-master are deliberately
 *  excluded (no server-side mission-completion record exists yet).
 *
 *  No separate claimed-trophies ledger: every reward here is a skin
 *  unlock, and granting the same skin twice (hSet on an already-'1'
 *  field) is a no-op, so this endpoint is naturally replay-safe
 *  without one. If a future trophy ever pays out something
 *  non-idempotent (cash, say), that reward would need its own claimed
 *  set before landing here -- flagging for whoever adds the next one. */
export async function dbClaimTrophyReward(
  username: string,
  trophyId: string,
): Promise<
  {ok: true; profile: TpProfileRsp; skinId: string} | {ok: false; error: string}
> {
  const trophy = TS_CLAIMABLE_TROPHIES[trophyId]
  if (!trophy) return {ok: false, error: `${trophyId} is not server-claimable yet`}
  const [{history, allTimeTotal}, missions] = await Promise.all([
    dbGetHistory(username),
    dbGetMissions(username),
  ])
  if (!trophy.check(history, allTimeTotal, missions)) {
    return {ok: false, error: `${trophyId} not yet earned`}
  }
  await redis.hSet(tpOwnedKey(username), {[trophy.rewardSkinId]: '1'})
  return {
    ok: true,
    profile: await dbGetTpProfile(username),
    skinId: trophy.rewardSkinId,
  }
}

/** Writes {tipCents, ms} into this user's permanent history for dateStr,
 *  but only if it beats whatever's already recorded there (same
 *  tip-desc/ms-asc comparison as the daily board, via encodeScore).
 *  Shared by both dbSubmitScore (today, bookkeeping only — does not
 *  affect that function's unconditional all-time add) and
 *  dbSubmitReplayScore (past days, where this comparison IS the
 *  all-time gate). Returns whether it wrote. */
async function dbWriteHistoryIfBetter(
  username: string,
  dateStr: string,
  tipCents: number,
  ms: number,
): Promise<boolean> {
  const key = historyKey(username)
  const existingRaw = await redis.hGet(key, dateStr)
  if (existingRaw !== undefined) {
    try {
      const existing = JSON.parse(existingRaw) as {tipCents: number; ms: number}
      if (encodeScore(tipCents, ms) <= encodeScore(existing.tipCents, existing.ms)) return false
    } catch {
      // corrupt existing entry — fall through and overwrite it
    }
  }
  await redis.hSet(key, {[dateStr]: JSON.stringify({tipCents, ms})})
  return true
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

  // Wallet credit piggybacks on the same unconditional add: every
  // completed delivery pays into the spendable wallet too, same as it
  // pays into the all-time total above. Separate hash field (see
  // tpProfileKey) so a later purchase can spend it without touching
  // the leaderboard's immutable lifetime figure.
  await redis.hIncrBy(tpProfileKey(username), 'walletCents', tipCents)

  // Bookkeeping only — keeps today's result available in Past Routes
  // once the day rolls over. Does not affect the unconditional add
  // above, which is unique to today; replays of past days use
  // dbSubmitReplayScore instead, where this same history record is
  // the actual gate on the all-time total.
  await dbWriteHistoryIfBetter(username, dateStr, tipCents, ms)

  const [daily, allTime] = await Promise.all([
    dbGetTop(dateStr, 10),
    dbGetAllTimeTop(10),
  ])
  return {daily, allTime}
}

/** Replaying a day the player has already completed. Unlike today's
 *  flow above (every run adds its full tip to all-time), a replay only
 *  nudges the all-time total by the IMPROVEMENT over this player's
 *  prior best for that specific day — otherwise grinding old, easy
 *  days would let the all-time board be farmed for free. This was an
 *  explicit product decision (loyal players should be able to grow
 *  their all-time total by replaying), not a security default, so the
 *  guards here are about eligibility and correctness, not about
 *  blocking replay itself:
 *
 *  - dateStr must be strictly before today. Today goes through
 *    dbSubmitScore instead, which never checks this — if this function
 *    silently accepted today's date too, a replay submission would
 *    double-count alongside the normal submit.
 *  - dateStr must already exist in this user's history. That history
 *    entry can only have been written by dbSubmitScore (today's normal
 *    flow) or a previous call to this same function, both of which are
 *    server-authenticated — so this is really "you can only replay a
 *    day you actually completed," not a new trust boundary. It's also
 *    exactly what makes the delta computation possible at all: no
 *    prior score, nothing to compare against.
 */
export async function dbSubmitReplayScore(
  dateStr: string,
  tip: number,
  ms: number,
  username: string,
): Promise<{
  improved: boolean
  delta: number
  tip: number
  ms: number
  allTime: {best: DailyBest; top: LeaderboardEntry[]}
}> {
  if (dateStr >= todayUTC()) {
    throw new Error(`dbSubmitReplayScore: ${dateStr} is not a past date`)
  }
  const key = historyKey(username)
  const existingRaw = await redis.hGet(key, dateStr)
  if (existingRaw === undefined) {
    throw new Error(`dbSubmitReplayScore: no history for ${username} on ${dateStr}`)
  }
  const existing = JSON.parse(existingRaw) as {tipCents: number; ms: number}
  const tipCents = Math.round(tip * 100)
  const improved = encodeScore(tipCents, ms) > encodeScore(existing.tipCents, existing.ms)

  if (improved) {
    const delta = Math.max(0, tipCents - existing.tipCents)
    if (delta > 0) {
      await redis.zIncrBy(ALLTIME_KEY, username, delta)
      // Same wallet piggyback as dbSubmitScore, but gated on delta > 0
      // like the all-time zIncrBy right above it -- a replay that
      // doesn't improve the day's record credits nothing to either.
      await redis.hIncrBy(tpProfileKey(username), 'walletCents', delta)
    }
    await redis.hSet(key, {[dateStr]: JSON.stringify({tipCents, ms})})

    // Also refresh that day's own board, so a replay shows up in the
    // historical leaderboard for that date too — same zAdd-if-better +
    // TTL-refresh dbSubmitScore does for today, reused here against an
    // arbitrary past date instead.
    const dailyKey = leaderboardKey(dateStr)
    const newScore = encodeScore(tipCents, ms)
    const dailyCurrent = await redis.zScore(dailyKey, username)
    if (dailyCurrent === undefined || newScore > dailyCurrent) {
      await redis.zAdd(dailyKey, {member: username, score: newScore})
      await redis.expire(dailyKey, DAILY_TTL_SECONDS)
    }

    const allTime = await dbGetAllTimeTop(10)
    return {
      improved,
      delta: delta / 100,
      tip,
      ms,
      allTime: {best: allTime[0] ?? null, top: allTime},
    }
  }

  const allTime = await dbGetAllTimeTop(10)
  return {
    improved: false,
    delta: 0,
    tip: existing.tipCents / 100,
    ms: existing.ms,
    allTime: {best: allTime[0] ?? null, top: allTime},
  }
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
    redis.del(historyKey(username)),
    redis.del(tpProfileKey(username)),
    redis.del(tpOwnedKey(username)),
    /* milestone-announce ledger: same user-scoped lifetime as the two
       keys above, so it has to be dropped here or a deleted account
       would leave a record of what it once unlocked. */
    redis.del(announcedKey(username)),
    redis.del(tpMissionsKey(username)),
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
