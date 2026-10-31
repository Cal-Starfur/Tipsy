import {reddit, redis} from '@devvit/web/server'
import type {DailyBest, LeaderboardEntry, TpProfileRsp} from '../shared/api.ts'
import {
  TS_ARCADE,
  TS_CLAIMABLE_TROPHIES,
  TS_MISSIONS,
  TS_HOODS,
  TS_SKINS,
  type TsMissionState,
  tsMissionComplete,
  tsSuccessPct,
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
/** One hash field per owned hood index, value '1' -- same presence
 *  idiom as tpOwnedKey. Hood 0 (The Flats) is never written; it's
 *  implicitly owned and dbGetTpProfile adds it back on every read. */
function tpHoodsKey(username: string): string {
  return `tipsy:global:tphoods:${username}`
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

/** LEGACY: the old Reddit retry gate's per-user hash (removed with the
 *  win/fail post gates). Nothing writes it any more; it is only named
 *  so dbRemoveUser can still purge rows a past build left behind. */
function failPendingKey(username: string): string {
  return `tipsy:global:failpending:${username}`
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
  if (!def)
    return {ok: false, error: `${missionId} is not a recordable mission`}
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
export async function dbGetHistory(username: string): Promise<{
  history: {dateStr: string; tip: number; ms: number}[]
  allTimeTotal: number
}> {
  const [raw, allTimeScore] = await Promise.all([
    redis.hGetAll(historyKey(username)),
    redis.zScore(ALLTIME_KEY, username),
  ])
  const history = Object.entries(raw)
    .map(([dateStr, json]) => {
      try {
        const {tipCents, ms} = JSON.parse(json) as {
          tipCents: number
          ms: number
        }
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
 *  and everyone has it. */
export async function dbGetTpProfile(username: string): Promise<TpProfileRsp> {
  const [profile, ownedRaw, missions] = await Promise.all([
    redis.hGetAll(tpProfileKey(username)),
    redis.hGetAll(tpOwnedKey(username)),
    dbGetMissions(username),
  ])
  const walletCents = parseInt(profile.walletCents ?? '0', 10) || 0
  const equipped = profile.equipped || 'classic'
  const [hoodsRaw, deliveries, homed, sheltered, arcade] = await Promise.all([
    redis.hGetAll(tpHoodsKey(username)),
    dbGetDeliveries(username, profile.deliveries),
    redis.hGetAll(tpDogsHomedKey(username)),
    redis.hGetAll(tpDogsShelteredKey(username)),
    redis.hGetAll(tpArcadeKey(username)),
  ])
  const dogs = {homed, sheltered}
  const hoodsOwned = [0, ...Object.keys(hoodsRaw ?? {})
    .map(k => parseInt(k, 10)).filter(i => TS_HOODS[i] !== undefined)]
    .sort((x, y) => x - y)
  /* missions ships on the profile rather than its own endpoint so a
     player who cleared the course on their phone sees the trophy card
     filled in on desktop -- the client merges this into its local
     missionsCompleted/hjBest on every requestTpProfile. */
  return {
    walletCents,
    owned: ['classic', ...Object.keys(ownedRaw)],
    equipped,
    hoodsOwned,
    deliveries,
    lost: Number.parseInt(profile.lost ?? '0', 10) || 0,
    dogsRescued: Number.parseInt(profile.dogsRescued ?? '0', 10) || 0,
    dogsHomed: Object.keys(dogs.homed ?? {}),
    shelteredDogs: Object.keys(dogs.sheltered ?? {}),
    arcadeCredits: Number.parseInt(arcade.credits ?? '0', 10) || 0,
    missions,
  }
}

/** Per-day slalom payout high-water, one hash field per dateStr.
 *  Sibling of tpMissionsKey and shares its lifetime reasoning: no TTL,
 *  because a year of daily fields is ~365 tiny entries -- not worth a
 *  dated-key TTL scheme like the daily boards use. */
function tpSlalomTipKey(username: string): string {
  return `tipsy:global:tpsltip:${username}`
}

/** Slalom tip claim: pays the improvement over the day's payout
 *  high-water into the spendable wallet. The claim is self-reported --
 *  the server never ran the course and cannot re-derive the time -- so
 *  it is bounded the same way dbRecordMission bounds a forged count:
 *  capped to SLALOM_TIP_DAILY_MAX_CENTS, and only the DELTA over the
 *  day's previous payout is credited, which is the replay replace/delta
 *  rule applied to a mission ("run again" grinding pays nothing unless
 *  the run beat the day's best). The high-water is read-modify-write
 *  like dbRecordMission's; the credit itself is a single hIncrBy, so a
 *  concurrent double-claim costs at most one delta, never two. dateStr
 *  MUST come from the route's todayUTC(), never the client -- see
 *  routeClaimSlalomTip. Only cosmetic skins ride on the wallet, which
 *  is what makes the $20/day forgery ceiling an acceptable bound. */
export const SLALOM_TIP_DAILY_MAX_CENTS = 2000
export async function dbClaimSlalomTip(
  username: string,
  dateStr: string,
  claimCents: number,
): Promise<{credited: number; walletCents: number}> {
  const raw =
    typeof claimCents === 'number' ? Math.floor(claimCents) : Number.NaN
  const claim = Number.isFinite(raw)
    ? Math.min(SLALOM_TIP_DAILY_MAX_CENTS, Math.max(0, raw))
    : 0
  const key = tpSlalomTipKey(username)
  const prev = parseInt((await redis.hGet(key, dateStr)) ?? '0', 10) || 0
  const credited = Math.max(0, claim - prev)
  if (credited > 0) await redis.hSet(key, {[dateStr]: String(claim)})
  const walletCents =
    credited > 0
      ? await redis.hIncrBy(tpProfileKey(username), 'walletCents', credited)
      : parseInt(
          (await redis.hGet(tpProfileKey(username), 'walletCents')) ?? '0',
          10,
        ) || 0
  return {credited, walletCents}
}

/** THE HOSPITAL'S TIP ENVELOPES. The game hides one in a gift room on
 *  each of these floors of Marina General (gift id 'g' + floor +
 *  'tips'); using one pays GIFT_TIP_CENTS, once per id per user, ever --
 *  the field's hIncrBy is the claim, so only the call that takes it from
 *  0 to 1 pays, and a concurrent double-use pays once. Any other id pays
 *  nothing, so the most a webview can ever forge is the set's total
 *  (7 x $2.50). Keep GIFT_TIP_IDS in step with game/index.html's
 *  HOSP_FLOORS 'gift tips' rooms. */
export const GIFT_TIP_CENTS = 250
/** THE HEART RUN'S TIP: the donor heart delivered to Marina General's ER
 *  pays HEART_TIP_CENTS once per user, ever, on the same claim as the
 *  envelopes (id HEART_TIP_ID). Keep in step with game/index.html's
 *  HOSP_THANKS.tipCents. */
export const HEART_TIP_ID = 'heart'
export const HEART_TIP_CENTS = 10000
/** LUNA'S $100 (game/index.html GOTH, MISSIONS 'goth-uniform'): paid once
 *  per user, ever, on the same claim (id LUNA_TIP_ID). Keep in step with
 *  MISSIONS['goth-uniform'].reward.cents. */
export const LUNA_TIP_ID = 'luna'
export const LUNA_TIP_CENTS = 10000
/** THE LIGHTHOUSE RUN'S $50 (game/index.html LH, MISSIONS
 *  'lighthouse-run'): paid once per user, ever, on the same claim (id
 *  LIGHTHOUSE_TIP_ID). Keep in step with its reward.cents. */
export const LIGHTHOUSE_TIP_ID = 'lighthouse'
export const LIGHTHOUSE_TIP_CENTS = 5000
/** what each once-ever claim pays: the story missions' by id, every
 *  other id in GIFT_TIP_IDS an envelope's GIFT_TIP_CENTS */
const ONCE_TIP_CENTS: Record<string, number> = {
  [HEART_TIP_ID]: HEART_TIP_CENTS,
  [LUNA_TIP_ID]: LUNA_TIP_CENTS,
  [LIGHTHOUSE_TIP_ID]: LIGHTHOUSE_TIP_CENTS,
}
export const GIFT_TIP_IDS: ReadonlySet<string> = new Set([
  HEART_TIP_ID,
  LUNA_TIP_ID,
  LIGHTHOUSE_TIP_ID,
  'g1tips',
  'g2tips',
  'g3tips',
  'g4tips',
  'g5tips',
  'g6tips',
  'g8tips',
])
function tpGiftTipKey(username: string): string {
  return `tipsy:global:tpgifttip:${username}`
}
/** THE ENVELOPES OUT IN THE WORLD (game/index.html GIFT_WORLD): each day
 *  has its own scatter, and each owned hood's set holds at most
 *  WORLD_TIP_SLOTS envelopes, asked for as 'w<hood>.<slot>'. Each pays
 *  GIFT_TIP_CENTS once per slot per SERVER day (one hIncrBy on that
 *  day's key, which expires on its own), and only in a hood the player
 *  owns (The Flats always; the rest from tpHoodsKey). So the most a
 *  webview can forge in a day is WORLD_TIP_SLOTS envelopes a hood owned.
 *  Keep WORLD_TIP_SLOTS in step with GIFT_WORLD.tipMax. */
export const WORLD_TIP_SLOTS = 14
const WORLD_TIP_TTL_SECONDS = 3 * 24 * 60 * 60
const WORLD_TIP_RE = /^w(\d{1,2})\.(\d{1,2})$/
function tpWorldTipKey(username: string, dateStr: string): string {
  return `tipsy:global:tpworldtip:${username}:${dateStr}`
}
async function worldTipClaim(
  username: string,
  id: string,
  dateStr: string,
): Promise<number> {
  const m = WORLD_TIP_RE.exec(id)
  if (!m) return 0
  const hood = Number.parseInt(m[1] ?? '', 10)
  const slot = Number.parseInt(m[2] ?? '', 10)
  if (
    (hood !== 0 && TS_HOODS[hood] === undefined) ||
    !(slot >= 0 && slot < WORLD_TIP_SLOTS)
  )
    return 0
  if (
    hood !== 0 &&
    (await redis.hGet(tpHoodsKey(username), String(hood))) === undefined
  )
    return 0
  const key = tpWorldTipKey(username, dateStr)
  const n = await redis.hIncrBy(key, `${hood}.${slot}`, 1)
  if (n !== 1) return 0
  await redis.expire(key, WORLD_TIP_TTL_SECONDS)
  return GIFT_TIP_CENTS
}
export async function dbClaimGiftTip(
  username: string,
  id: string,
  dateStr: string = todayUTC(),
): Promise<{credited: number; walletCents: number}> {
  let credited = 0
  if (GIFT_TIP_IDS.has(id)) {
    const n = await redis.hIncrBy(tpGiftTipKey(username), id, 1)
    if (n === 1) credited = ONCE_TIP_CENTS[id] ?? GIFT_TIP_CENTS
  } else credited = await worldTipClaim(username, id, dateStr)
  const walletCents =
    credited > 0
      ? await redis.hIncrBy(tpProfileKey(username), 'walletCents', credited)
      : parseInt(
          (await redis.hGet(tpProfileKey(username), 'walletCents')) ?? '0',
          10,
        ) || 0
  return {credited, walletCents}
}

/** A LOST DOG BROUGHT HOME (game/index.html LOST_DOG): the owner's tip,
 *  DOG_RESCUE_CENTS, into the wallet. The claim is self-reported (the
 *  rescue happens in the webview), so it is capped: the day's count is
 *  one hIncrBy on a per-user hash keyed by the server's dateStr, and only
 *  a call that lands at or under DOG_RESCUE_MAX_PER_DAY pays -- a
 *  concurrent double-claim costs at most one extra rescue of the day's
 *  allowance, never an unbounded sum. Every call bumps the lifetime count
 *  (the profile's dogsRescued, the Dog Rescuer trophy's number) whether
 *  it paid or not. Keep the cents in step with LOST_DOG.tipCents. */
export const DOG_RESCUE_CENTS = 2000
export const DOG_RESCUE_MAX_PER_DAY = 6
function tpDogRescueKey(username: string): string {
  return `tipsy:global:tpdogrescue:${username}`
}
export async function dbClaimDogRescue(
  username: string,
  dateStr: string,
  dogKey?: string,
): Promise<{credited: number; walletCents: number; dogsRescued: number}> {
  if (tsDogKeyOk(dogKey))
    await redis.hSet(tpDogsHomedKey(username), {[dogKey]: '1'})
  const n = await redis.hIncrBy(tpDogRescueKey(username), dateStr, 1)
  const credited = n <= DOG_RESCUE_MAX_PER_DAY ? DOG_RESCUE_CENTS : 0
  const key = tpProfileKey(username)
  const dogsRescued = await redis.hIncrBy(key, 'dogsRescued', 1)
  const walletCents =
    credited > 0
      ? await redis.hIncrBy(key, 'walletCents', credited)
      : parseInt((await redis.hGet(key, 'walletCents')) ?? '0', 10) || 0
  return {credited, walletCents, dogsRescued}
}

/** A LOST THING RETURNED (game/index.html LOST_ITEMS): its owner's tip.
 *  The id is the item's own, 'l<YYYYMMDD>.<hood>.<kind>.<slot>': its
 *  day's scatter, its hood, what it is, its slot. Each pays its kind's
 *  LOST_RETURN_CENTS once, ever (one hIncrBy on that item day's key, which
 *  expires on its own), only for a slot below LOST_SLOTS, a hood the
 *  player owns, and an item day no older than LOST_RETURN_DAYS before the
 *  server's today (a thing carried for longer is still thanked in the
 *  game, unpaid). So the most a forged webview can take is LOST_SLOTS x
 *  the dearest kind a hood a day. No count is kept here: the return
 *  count is the game's collect save (Sir: "no new karma count").
 *  Keep in step with LOST_ITEMS.perHood and LOST_ITEM_KINDS' cents. */
export const LOST_SLOTS = 4
export const LOST_RETURN_DAYS = 2
export const LOST_RETURN_CENTS: Readonly<Record<string, number>> = {
  wallet: 500,
  phone: 400,
  purse: 400,
  keys: 300,
  collar: 200,
  lunch: 100,
}
const LOST_RETURN_TTL_SECONDS = (LOST_RETURN_DAYS + 2) * 24 * 60 * 60
const LOST_ID_RE = /^l(\d{4})(\d{2})(\d{2})\.(\d{1,2})\.([a-z]+)\.(\d{1,2})$/
function tpLostReturnKey(username: string, dateStr: string): string {
  return `tipsy:global:tplostret:${username}:${dateStr}`
}
async function lostReturnClaim(
  username: string,
  id: string,
  today: string,
): Promise<number> {
  const m = LOST_ID_RE.exec(id)
  if (!m) return 0
  const day = `${m[1]}-${m[2]}-${m[3]}`
  const hood = Number.parseInt(m[4] ?? '', 10)
  const kind = m[5] ?? ''
  const slot = Number.parseInt(m[6] ?? '', 10)
  const cents = LOST_RETURN_CENTS[kind]
  if (!cents || !(slot >= 0 && slot < LOST_SLOTS)) return 0
  const age =
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) /
    86400000
  if (!(age >= 0 && age <= LOST_RETURN_DAYS)) return 0
  if (hood !== 0 && TS_HOODS[hood] === undefined) return 0
  if (
    hood !== 0 &&
    (await redis.hGet(tpHoodsKey(username), String(hood))) === undefined
  )
    return 0
  const key = tpLostReturnKey(username, day)
  const n = await redis.hIncrBy(key, `${hood}.${slot}`, 1)
  if (n !== 1) return 0
  await redis.expire(key, LOST_RETURN_TTL_SECONDS)
  return cents
}
export async function dbClaimLostReturn(
  username: string,
  id: string,
  today: string = todayUTC(),
): Promise<{credited: number; walletCents: number}> {
  const credited = await lostReturnClaim(username, id, today)
  const key = tpProfileKey(username)
  const walletCents =
    credited > 0
      ? await redis.hIncrBy(key, 'walletCents', credited)
      : parseInt((await redis.hGet(key, 'walletCents')) ?? '0', 10) || 0
  return {credited, walletCents}
}

/** THE DOGS FOR GOOD (game/index.html tpProfile.dogsHomed / shelteredDogs):
 *  one hash field per dog key, value '1'. A key is the game's own string
 *  (a hood's lost-dog key, a frontage's city key); anything else is
 *  refused, and the list is bounded by the city's own dogs. */
function tpDogsHomedKey(username: string): string {
  return `tipsy:global:tpdogshomed:${username}`
}
function tpDogsShelteredKey(username: string): string {
  return `tipsy:global:tpdogssheltered:${username}`
}
function tsDogKeyOk(key: unknown): key is string {
  return (
    typeof key === 'string' &&
    key.length > 0 &&
    key.length <= 160 &&
    /^[\w|:,.\- ]+$/.test(key)
  )
}
export async function dbRecordShelter(
  username: string,
  key: string,
): Promise<{dogsSheltered: number}> {
  const k = tpDogsShelteredKey(username)
  if (tsDogKeyOk(key)) await redis.hSet(k, {[key]: '1'})
  return {dogsSheltered: Object.keys((await redis.hGetAll(k)) ?? {}).length}
}

/** HIGH TIDE'S GAME CARD: credits in their own hash ('credits'), the once-
 *  ever grant's flag ('granted') beside them. grant pays TS_ARCADE.grantCredits
 *  once, and only after 'arcade-card' is recorded (Marisol's thanks). spend
 *  takes a credit; an empty card is topped up first from the wallet at
 *  TS_ARCADE's price (the debit-then-check of dbPurchaseSkin: an hIncrBy
 *  that would go negative is refunded and the spend refused). */
function tpArcadeKey(username: string): string {
  return `tipsy:global:tparcade:${username}`
}
export async function dbArcade(
  username: string,
  op: string,
): Promise<{ok: boolean; credits: number; walletCents: number; toppedUp: boolean}> {
  const key = tpArcadeKey(username)
  const pkey = tpProfileKey(username)
  const wallet = async () =>
    parseInt((await redis.hGet(pkey, 'walletCents')) ?? '0', 10) || 0
  const credits = async () =>
    parseInt((await redis.hGet(key, 'credits')) ?? '0', 10) || 0
  let ok = false
  let toppedUp = false
  if (op === 'grant') {
    const missions = await dbGetMissions(username)
    if (
      tsMissionComplete(missions, 'arcade-card') &&
      (await redis.hSetNX(key, 'granted', '1'))
    )
      await redis.hIncrBy(key, 'credits', TS_ARCADE.grantCredits)
    ok = true
  } else if (op === 'spend') {
    if ((await credits()) <= 0) {
      const w = await redis.hIncrBy(pkey, 'walletCents', -TS_ARCADE.topupCents)
      if (w < 0) await redis.hIncrBy(pkey, 'walletCents', TS_ARCADE.topupCents)
      else {
        await redis.hIncrBy(key, 'credits', TS_ARCADE.topupCredits)
        toppedUp = true
      }
    }
    const c = await redis.hIncrBy(key, 'credits', -1)
    if (c < 0) await redis.hIncrBy(key, 'credits', 1)
    else ok = true
  }
  return {ok, credits: await credits(), walletCents: await wallet(), toppedUp}
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

/** Lifetime delivery count behind the hood store's unlock tiers. Lives
 *  in tpProfileKey's `deliveries` field and is bumped by dbSubmitScore
 *  once per completed today's-route delivery (the same event the client
 *  counts in tpBankDayTip). A profile that predates the field is seeded
 *  ONCE from its history -- one entry per day delivered, so an
 *  undercount, never a free unlock -- via hSetNX, so a delivery landing
 *  in between is never overwritten. */
async function dbGetDeliveries(username: string, stored: string | undefined): Promise<number> {
  if (stored !== undefined) return parseInt(stored, 10) || 0
  const days = Object.keys((await redis.hGetAll(historyKey(username))) ?? {}).length
  const key = tpProfileKey(username)
  await redis.hSetNX(key, 'deliveries', String(days))
  return parseInt((await redis.hGet(key, 'deliveries')) ?? '0', 10) || 0
}

/** Orders lost to a tip-over, the other half of success % (see
 *  tsSuccessPct). Lives beside `deliveries` in tpProfileKey. The count is
 *  the client's -- only it knows what was aboard -- so it is clamped to
 *  what can be: 1..3 orders (TP_CARRY_MAX), one tip at a time. */
export async function dbRecordLost(username: string, count: number): Promise<number> {
  const n = Number.isInteger(count) ? Math.min(3, Math.max(1, count)) : 1
  return await redis.hIncrBy(tpProfileKey(username), 'lost', n)
}

/** Server-authoritative hood purchase (Sir, 2026-09-16: hybrid unlock).
 *  Order matters and each step is the cheap refusal before the costly
 *  one: known hood -> not already owned (a retry must not charge twice)
 *  -> delivery requirement met (from the server's own count, never the
 *  client's) -> debit with dbPurchaseSkin's atomic
 *  deduct-then-refund-if-negative -> grant. */
export async function dbPurchaseHood(
  username: string,
  hoodIndex: number,
): Promise<{ok: true; profile: TpProfileRsp} | {ok: false; error: string}> {
  const idx = typeof hoodIndex === 'number' && Number.isInteger(hoodIndex) ? hoodIndex : -1
  const h = TS_HOODS[idx]
  if (!h) return {ok: false, error: `unknown hood: ${hoodIndex}`}
  if ((await redis.hGet(tpHoodsKey(username), String(idx))) !== undefined) {
    return {ok: false, error: `${h.name} already owned`}
  }
  const key = tpProfileKey(username)
  const deliveries = await dbGetDeliveries(username, await redis.hGet(key, 'deliveries'))
  if (deliveries < h.deliveries) {
    return {ok: false, error: `${h.name} needs ${h.deliveries} deliveries (have ${deliveries})`}
  }
  const lost = Number.parseInt((await redis.hGet(key, 'lost')) ?? '0', 10) || 0
  const pct = tsSuccessPct(deliveries, lost)
  if (pct < h.minSuccess) {
    return {ok: false, error: `${h.name} needs ${h.minSuccess}% success (have ${pct}%)`}
  }
  const newBalance = await redis.hIncrBy(key, 'walletCents', -h.priceCents)
  if (newBalance < 0) {
    await redis.hIncrBy(key, 'walletCents', h.priceCents) // refund
    return {ok: false, error: 'insufficient funds'}
  }
  await redis.hSet(tpHoodsKey(username), {[String(idx)]: '1'})
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
  if (!trophy)
    return {ok: false, error: `${trophyId} is not server-claimable yet`}
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
      if (
        encodeScore(tipCents, ms) <= encodeScore(existing.tipCents, existing.ms)
      )
        return false
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
  const dailyKey = leaderboardKey(dateStr)

  const [dailyCurrent, allTimeCurrent] = await Promise.all([
    redis.zScore(dailyKey, username),
    redis.zScore(ALLTIME_KEY, username),
  ])

  // TODAY'S BOARD IS A RUNNING TOTAL NOW (Sir's call, 2026-08-13: "it
  // should keep all your tips for the whole day"). The daily used to be
  // a race for the single best delivery -- zAdd only when newScore beat
  // the stored one -- which made sense when there was one route a day.
  // The ladder means a player runs as many as they like, so the day's
  // score is the sum of what they earned on it, and every delivery
  // counts rather than only the luckiest.
  //
  // TIPS SUM, TIME DOES NOT. The tiebreak stays the player's FASTEST
  // single run, and that is a correctness requirement rather than a
  // taste one: encodeScore packs ms into a SCORE_MULT-wide field
  // (10_000_000, about 2.8 hours), so a summed ms would overflow that
  // field on a long session and carry straight into the tip digits,
  // silently inflating the score it was meant to break ties on. A
  // best-of ms is bounded by a single delivery and cannot.
  const prevDaily =
    dailyCurrent === undefined ? null : decodeScore(dailyCurrent)
  const dayTipCents = (prevDaily ? prevDaily.tipCents : 0) + tipCents
  const dayBestMs = prevDaily ? Math.min(prevDaily.ms, ms) : ms
  const newScore = encodeScore(dayTipCents, dayBestMs)
  // Unconditional: a completed delivery always adds to the day. The
  // only reason to skip is a zero-tip run, which cannot move the total
  // and whose ms has no business improving the tiebreak either.
  const dailyBetter = tipCents > 0 || dailyCurrent === undefined
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
  // Hood store: one lifetime delivery per completed today's-route run.
  // Seed first so an old profile's history backfill lands before the +1.
  await dbGetDeliveries(username, await redis.hGet(tpProfileKey(username), 'deliveries'))
  await redis.hIncrBy(tpProfileKey(username), 'deliveries', 1)

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
    throw new Error(
      `dbSubmitReplayScore: no history for ${username} on ${dateStr}`,
    )
  }
  const existing = JSON.parse(existingRaw) as {tipCents: number; ms: number}
  const tipCents = Math.round(tip * 100)
  const improved =
    encodeScore(tipCents, ms) > encodeScore(existing.tipCents, existing.ms)

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

    // Also refresh that day's own board. Still zAdd-IF-BETTER here, and
    // deliberately NOT the running total dbSubmitScore now keeps: a
    // replay is a second attempt at a day that is already scored, so
    // adding its tip would let an old day's board be farmed by simply
    // replaying it -- the exact farming the delta rule above exists to
    // stop, and it would be strange to close that door on the all-time
    // total while leaving it open on the day itself. A past day's board
    // stays a best-of.
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
    redis.del(tpHoodsKey(username)),
    /* milestone-announce ledger: same user-scoped lifetime as the two
       keys above, so it has to be dropped here or a deleted account
       would leave a record of what it once unlocked. */
    redis.del(announcedKey(username)),
    redis.del(tpMissionsKey(username)),
    /* the old retry gate's legacy hash, if a past build wrote one */
    redis.del(failPendingKey(username)),
    /* which hospital tip envelopes it has used */
    redis.del(tpGiftTipKey(username)),
    /* and today's world envelopes (past days' expire on their own) */
    redis.del(tpWorldTipKey(username, dateStr)),
    /* and the lost things returned, by their day (past days' expire on their own) */
    ...[0, 1, 2].map(d =>
      redis.del(
        tpLostReturnKey(
          username,
          new Date(Date.parse(`${dateStr}T00:00:00Z`) - d * 86400000)
            .toISOString()
            .slice(0, 10),
        ),
      ),
    ),
    /* the dogs taken home and to the shelter, and High Tide's card */
    redis.del(tpDogsHomedKey(username)),
    redis.del(tpDogsShelteredKey(username)),
    redis.del(tpArcadeKey(username)),
  ])
}

const STICKY_COMMENT_PREFIX = 'tipsy:global:stickycomment:'

/** The pinned anchor comment automated score replies nest under
 *  (r/Devvit app-review requirement), keyed PER POST rather than as a
 *  single current-post pointer: yesterday's post stays reachable from
 *  a player's history, and a fail reported there must thread under
 *  that post's own anchor, not today's. No expiry — a comment id is
 *  tiny and the post it belongs to never stops existing. */
export async function dbGetStickyCommentId(
  postId: string,
): Promise<string | null> {
  const id = await redis.get(STICKY_COMMENT_PREFIX + postId)
  return id ?? null
}

export async function dbSetStickyCommentId(
  postId: string,
  commentId: string,
): Promise<void> {
  await redis.set(STICKY_COMMENT_PREFIX + postId, commentId)
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
