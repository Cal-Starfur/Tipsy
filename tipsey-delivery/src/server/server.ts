import {once} from 'node:events'
import type {IncomingMessage, ServerResponse} from 'node:http'
import {context, reddit} from '@devvit/web/server'
import type {
  PartialJsonValue,
  TriggerResponse,
  UiResponse,
} from '@devvit/web/shared'
import {
  type AccountDeleteEvent,
  type ClaimTrophyRewardReq,
  type ClaimTrophyRewardRsp,
  type CompleteMissionReq,
  type CompleteMissionRsp,
  type CountPlayRsp,
  Endpoint,
  EndpointMethod,
  type EquipSkinReq,
  type EquipSkinRsp,
  type ErrorRsp,
  type GetDailyBestRsp,
  type GetHistoryRsp,
  type PurchaseSkinReq,
  type PurchaseSkinRsp,
  type SubmitDailyBestReq,
  type SubmitDailyBestRsp,
  type SubmitFailReq,
  type SubmitFailRsp,
  type SubmitReplayReq,
  type SubmitReplayRsp,
  type TpProfileRsp,
} from '../shared/api.ts'
import {
  dbClaimTrophyReward,
  dbEquipSkin,
  dbGetAllTimeBest,
  dbGetAllTimeTop,
  dbGetDailyBest,
  dbGetDailyPostId,
  dbGetHistory,
  dbGetPlays,
  dbGetTop,
  dbGetTpProfile,
  dbIncrPlays,
  dbMarkAnnounced,
  dbRecordMission,
  dbPurchaseSkin,
  dbRemoveUser,
  dbSetDailyPostId,
  dbShouldPostDaily,
  dbShouldRunWeeklySweep,
  dbSubmitReplayScore,
  dbSubmitScore,
  dbSweepDeletedUsers,
  todayUTC,
} from './db.ts'
import {TS_SKINS} from './tpcatalog.ts'

type AnyRsp =
  | GetDailyBestRsp
  | SubmitDailyBestRsp
  | GetHistoryRsp
  | SubmitReplayRsp
  | TpProfileRsp
  | PurchaseSkinRsp
  | EquipSkinRsp
  | ClaimTrophyRewardRsp
  | CountPlayRsp
  | CompleteMissionRsp
  | SubmitFailRsp
  | UiResponse
  | TriggerResponse
  | ErrorRsp

export async function onReq(
  reqMsg: IncomingMessage,
  rspMsg: ServerResponse,
): Promise<void> {
  try {
    await route(reqMsg, rspMsg)
  } catch (err) {
    const msg = `server error; ${err instanceof Error ? err.stack : err}`
    console.error(msg)
    writeJson<ErrorRsp>(500, {error: msg, status: 500}, rspMsg)
  }
}

async function route(
  reqMsg: IncomingMessage,
  rspMsg: ServerResponse,
): Promise<void> {
  const endpoint = reqMsg.url?.slice(1) as Endpoint
  const method = EndpointMethod[endpoint]

  let rsp: AnyRsp
  if (method !== reqMsg.method) {
    rsp = {error: 'not found', status: 404}
  } else {
    switch (endpoint) {
      case Endpoint.GetDailyBest:
        rsp = await routeGetDailyBest()
        break
      case Endpoint.SubmitDailyBest:
        rsp = await routeSubmitDailyBest(reqMsg)
        break
      case Endpoint.GetHistory:
        rsp = await routeGetHistory()
        break
      case Endpoint.SubmitReplay:
        rsp = await routeSubmitReplay(reqMsg)
        break
      case Endpoint.GetTpProfile:
        rsp = await routeGetTpProfile()
        break
      case Endpoint.PurchaseSkin:
        rsp = await routePurchaseSkin(reqMsg)
        break
      case Endpoint.EquipSkin:
        rsp = await routeEquipSkin(reqMsg)
        break
      case Endpoint.ClaimTrophyReward:
        rsp = await routeClaimTrophyReward(reqMsg)
        break
      case Endpoint.CompleteMission:
        rsp = await routeCompleteMission(reqMsg)
        break
      case Endpoint.CountPlay:
        rsp = await routeCountPlay()
        break
      case Endpoint.SubmitFail:
        rsp = await routeSubmitFail(reqMsg)
        break
      case Endpoint.OnMenuNewPost:
        rsp = await routeMenuNewPost()
        break
      case Endpoint.OnAppInstall:
        rsp = await routeAppInstall()
        break
      case Endpoint.OnAccountDelete:
        rsp = await routeAccountDelete(reqMsg)
        break
      case Endpoint.OnSchedulerDailyPost:
        rsp = await routeSchedulerDailyPost()
        break
      case Endpoint.OnSchedulerDeletedUserSweep:
        rsp = await routeSchedulerDeletedUserSweep()
        break
      default:
        endpoint satisfies never
        rsp = {error: 'not found', status: 404}
        break
    }
  }

  writeJson<PartialJsonValue>('status' in rsp ? rsp.status : 200, rsp, rspMsg)
}

/** reddit.getCurrentUser() has been observed failing intermittently in
 *  ways we've never been able to see, since it was previously wrapped
 *  in a bare `.catch(() => null)` that swallowed the actual error —
 *  confirmed on-device: a real player's submitted score landed under
 *  'anonymous' instead of their username. Retries a couple of times
 *  before giving up (cheap insurance against a transient failure,
 *  whatever the cause), and actually logs it now so `devvit logs`
 *  shows a real error next time instead of nothing. */
async function getCurrentUserRetrying() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const user = await reddit.getCurrentUser()
      if (user) return user
    } catch (err) {
      console.error(`getCurrentUser() attempt ${attempt} failed:`, err)
    }
    if (attempt < 3) await new Promise(r => setTimeout(r, 150 * attempt))
  }
  console.error('getCurrentUser() failed after 3 attempts -- falling back to anonymous')
  return null
}

async function routeGetDailyBest(): Promise<GetDailyBestRsp> {
  const dateStr = todayUTC()
  const [best, top, allTimeBest, allTimeTop, user, plays] = await Promise.all([
    dbGetDailyBest(dateStr),
    dbGetTop(dateStr, 10),
    dbGetAllTimeBest(),
    dbGetAllTimeTop(10),
    getCurrentUserRetrying(),
    dbGetPlays(dateStr),
  ])
  return {
    dateStr,
    best,
    viewerUsername: user?.username ?? null,
    top,
    allTime: {best: allTimeBest, top: allTimeTop},
    plays,
  }
}

async function routeSubmitDailyBest(
  reqMsg: IncomingMessage,
): Promise<SubmitDailyBestRsp> {
  const dateStr = todayUTC()
  const req = await readJson<SubmitDailyBestReq>(reqMsg)
  const user = await getCurrentUserRetrying()
  const username = user?.username ?? 'anonymous'
  const {daily, allTime} = await dbSubmitScore(
    dateStr,
    req.tip,
    req.ms,
    username,
  )
  const first = daily[0]
  const best = first
    ? {tip: first.tip, ms: first.ms, username: first.username}
    : null
  const allTimeFirst = allTime[0]
  const allTimeBest = allTimeFirst
    ? {
        tip: allTimeFirst.tip,
        ms: allTimeFirst.ms,
        username: allTimeFirst.username,
      }
    : null
  return {dateStr, best, top: daily, allTime: {best: allTimeBest, top: allTime}}
}

async function routeGetHistory(): Promise<GetHistoryRsp> {
  const user = await getCurrentUserRetrying()
  const username = user?.username ?? 'anonymous'
  return dbGetHistory(username)
}

async function routeSubmitReplay(
  reqMsg: IncomingMessage,
): Promise<SubmitReplayRsp | ErrorRsp> {
  const req = await readJson<SubmitReplayReq>(reqMsg)
  const user = await getCurrentUserRetrying()
  const username = user?.username ?? 'anonymous'
  try {
    const result = await dbSubmitReplayScore(req.dateStr, req.tip, req.ms, username)
    return {dateStr: req.dateStr, ...result}
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`routeSubmitReplay: ${msg}`)
    return {error: msg, status: 400}
  }
}

async function routeGetTpProfile(): Promise<TpProfileRsp> {
  const user = await getCurrentUserRetrying()
  const username = user?.username ?? 'anonymous'
  return dbGetTpProfile(username)
}

async function routePurchaseSkin(
  reqMsg: IncomingMessage,
): Promise<PurchaseSkinRsp | ErrorRsp> {
  const req = await readJson<PurchaseSkinReq>(reqMsg)
  const user = await getCurrentUserRetrying()
  const username = user?.username ?? 'anonymous'
  const result = await dbPurchaseSkin(username, req.skinId)
  if (!result.ok) {
    console.error(`routePurchaseSkin: ${username} -> ${req.skinId}: ${result.error}`)
    return {error: result.error, status: 400}
  }
  const price = TS_SKINS[req.skinId]?.priceCents ?? 0
  await announceMilestone(
    username,
    `skin:${req.skinId}`,
    `🛻 **u/${username}** kitted out — bought the **${skinLabel(req.skinId)}** paint job` +
      `${price ? ` for $${(price / 100).toFixed(2)}` : ''}.`,
  )
  return result.profile
}

async function routeEquipSkin(
  reqMsg: IncomingMessage,
): Promise<EquipSkinRsp | ErrorRsp> {
  const req = await readJson<EquipSkinReq>(reqMsg)
  const user = await getCurrentUserRetrying()
  const username = user?.username ?? 'anonymous'
  const result = await dbEquipSkin(username, req.skinId)
  if (!result.ok) {
    console.error(`routeEquipSkin: ${username} -> ${req.skinId}: ${result.error}`)
    return {error: result.error, status: 400}
  }
  return {equipped: result.equipped}
}

async function routeClaimTrophyReward(
  reqMsg: IncomingMessage,
): Promise<ClaimTrophyRewardRsp | ErrorRsp> {
  const req = await readJson<ClaimTrophyRewardReq>(reqMsg)
  const user = await getCurrentUserRetrying()
  const username = user?.username ?? 'anonymous'
  const result = await dbClaimTrophyReward(username, req.trophyId)
  if (!result.ok) {
    console.error(`routeClaimTrophyReward: ${username} -> ${req.trophyId}: ${result.error}`)
    return {error: result.error, status: 400}
  }
  const feat = TROPHY_FEAT[req.trophyId]
  await announceMilestone(
    username,
    `trophy:${req.trophyId}`,
    `🏆 **u/${username}** unlocked the **${skinLabel(result.skinId)}** skin` +
      `${feat ? ` — ${feat}` : ''}.`,
  )
  return {owned: result.profile.owned, skinId: result.skinId}
}

/** Records side-mission progress. Fires the announce comment only on
 *  firstCompletion, so the Hydrant Challenge -- which reports after
 *  every one of its ten jumps -- comments once, on the run that clears
 *  the last one, rather than ten times on the way down the street.
 *  A rejected id or count is a 400 with the reason: unlike the fail
 *  report, the client acts on this response (it corrects its local
 *  best from it), so failing silently would leave the two disagreeing. */
async function routeCompleteMission(
  reqMsg: IncomingMessage,
): Promise<CompleteMissionRsp | ErrorRsp> {
  const req = await readJson<CompleteMissionReq>(reqMsg)
  const user = await getCurrentUserRetrying()
  const username = user?.username ?? 'anonymous'
  const result = await dbRecordMission(username, req.missionId, req.best)
  if (!result.ok) {
    console.error(`routeCompleteMission: ${username} -> ${req.missionId}: ${result.error}`)
    return {error: result.error, status: 400}
  }
  if (result.firstCompletion) {
    const label = MISSION_LABELS[req.missionId] ?? req.missionId
    await announceMilestone(
      username,
      `mission:${req.missionId}`,
      `🧨 **u/${username}** cleared the **${label}**.`,
    )
  }
  return {
    missionId: req.missionId,
    best: result.best,
    completed: result.completed,
    firstCompletion: result.firstCompletion,
  }
}

/** The date comes from the SERVER's todayUTC(), not the client: the
 *  counter sits next to today's board and must be keyed the same way it
 *  is, and a client-supplied date would let any webview pad an
 *  arbitrary day's tally. */
async function routeCountPlay(): Promise<CountPlayRsp> {
  return {plays: await dbIncrPlays(todayUTC())}
}

/** The server owns every word of the failure copy: the client sends an
 *  ID, not prose. A client-supplied sentence would end up verbatim in
 *  a public comment under the app account's name, which is exactly the
 *  kind of thing that shouldn't be typeable from a webview. Unknown
 *  IDs fall back to the generic line rather than being echoed. */
const FAIL_CAUSE_COPY: {[cause: string]: string} = {
  william: 'kicked over by William',
  car: 'clipped by a car',
  palm: 'wrapped around a palm trunk',
  lamp: 'met a streetlamp',
  hydrant: 'bounced off a fire hydrant',
  slab: 'launched by a heaved slab',
  crack: 'swallowed by a sidewalk crack',
  cone: 'took out a cone',
  bin: 'hit a trash bin',
  trash: 'hit a pile of trash',
  scooter: 'tripped on a dumped scooter',
  planter: 'clipped a planter',
  dog: 'ambushed by a dog',
  pigeons: 'mobbed by pigeons',
  people: 'walked into a pedestrian',
  robot: 'sideswiped by another robot',
  grade: 'beaten by the grade',
  canceled: 'ran out the clock -- order canceled',
}
const FAIL_CAUSE_FALLBACK = 'lost balance'

/** Route text is generated client-side (the server never builds a
 *  route), so address/hood have to come from the client -- but they go
 *  straight into a public comment, so they're clamped to a sane length
 *  and stripped of anything that could turn into markdown, a newline,
 *  or a u//r/ mention that would ping a real account. */
function sanitizeLabel(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/[\r\n]+/g, ' ')
    .replace(/[*_`~[\]()<>|#]/g, '')
    .replace(/\b(u|r)\/(?=\w)/gi, '')
    .trim()
    .slice(0, max)
}

function clampNum(raw: unknown, lo: number, hi: number): number {
  const n = typeof raw === 'number' ? raw : Number.NaN
  if (!Number.isFinite(n)) return lo
  return Math.min(hi, Math.max(lo, n))
}

/** Comments on the post the run was played in, as the app account.
 *  context.postId is absent outside a post context (and the username
 *  is absent for a logged-out viewer) -- both are ordinary conditions,
 *  not errors, so they just return posted:false. A failed comment is
 *  logged but never surfaced: the player is staring at a crash
 *  overlay, and a toast about Reddit's rate limiter helps nobody. */
async function routeSubmitFail(
  reqMsg: IncomingMessage,
): Promise<SubmitFailRsp> {
  const req = await readJson<SubmitFailReq>(reqMsg)
  const postId = context.postId
  if (!postId) return {posted: false}

  const user = await getCurrentUserRetrying()
  if (!user?.username) return {posted: false}

  const cause = FAIL_CAUSE_COPY[req.cause] ?? FAIL_CAUSE_FALLBACK
  const address = sanitizeLabel(req.address, 48)
  const hood = sanitizeLabel(req.hood, 32)
  const pct = Math.round(clampNum(req.pct, 0, 100))
  const tip = clampNum(req.tip, 0, 9999)
  const secs = clampNum(req.ms, 0, 3_600_000) / 1000
  const damage = Math.round(clampNum(req.damage, 0, 100))

  const where = address
    ? `${pct}% of the way to ${address}${hood ? ` (${hood})` : ''}`
    : `${pct}% of the way to the door`

  const text =
    `**u/${user.username}** went down ${where} -- ${cause}.\n\n` +
    `$${tip.toFixed(2)} order · ${secs.toFixed(1)}s on the clock · cargo ${damage}% ruined.`

  return {posted: await postAppComment(text)}
}

/** Every comment the app account leaves goes through here. postId is
 *  absent outside a post context, which is an ordinary condition rather
 *  than an error. A throw is logged and swallowed on purpose: the
 *  caller is always mid-gameplay (crashing, buying, claiming), and a
 *  toast about Reddit's rate limiter would interrupt something the
 *  player cares about to report something they don't. */
async function postAppComment(text: string): Promise<boolean> {
  const postId = context.postId
  if (!postId) return false
  try {
    await reddit.submitComment({id: postId as `t3_${string}`, text})
    return true
  } catch (err) {
    console.error('postAppComment: submitComment failed', err)
    return false
  }
}

/** Display names for the milestone comments. The server owns every word
 *  it posts (same rule as FAIL_CAUSE_COPY), so it needs its own copy of
 *  these strings -- tpcatalog.ts deliberately mirrors only what the
 *  server must VALIDATE, not display text. Same drift cost its header
 *  already flags: rename a skin client-side and this table has to move
 *  in the same commit. */
const SKIN_LABELS: {[skinId: string]: string} = {
  'sunset-cruiser': 'Sunset Cruiser',
  'neon-courier': 'Neon Courier',
  'chrome-plate': 'Chrome Plate',
  'palm-camo': 'Palm Camo',
  'gold-rush': 'Gold Rush',
  'fire-chief': 'Fire Chief',
  'cone-dodger': 'Cone Dodger',
  'porch-pirate': 'Porch Pirate',
}

/** What the player actually DID to earn each trophy, in words. Keyed by
 *  trophyId and kept alongside TS_CLAIMABLE_TROPHIES's own list -- a
 *  trophy with no line here still grants its skin, it just announces
 *  itself plainly rather than with a wrong description. */
const MISSION_LABELS: {[missionId: string]: string} = {
  'jump-hydrant': 'Hydrant Challenge',
  'cone-slalom': 'Cone Slalom Challenge',
}

const TROPHY_FEAT: {[trophyId: string]: string} = {
  streak5: 'five days delivered in a row',
  highroller: '$500 banked all-time',
}

function skinLabel(skinId: string): string {
  return SKIN_LABELS[skinId] ?? skinId
}

/** Posts once per user per milestone, ever. dbMarkAnnounced is the
 *  guard, and it's checked BEFORE the comment goes out so a Reddit-side
 *  failure doesn't leave the event unmarked and re-announceable on the
 *  next call -- one missed comment beats a loop of duplicates. */
async function announceMilestone(
  username: string,
  event: string,
  text: string,
): Promise<void> {
  if (username === 'anonymous') return
  if (!(await dbMarkAnnounced(username, event))) return
  await postAppComment(text)
}

async function routeMenuNewPost(): Promise<UiResponse> {
  const post = await reddit.submitCustomPost({title: context.appSlug})
  return {
    showToast: {text: `Post ${post.id} created.`, appearance: 'success'},
    navigateTo: post.url,
  }
}

async function routeAppInstall(): Promise<TriggerResponse> {
  await reddit.submitCustomPost({title: context.appSlug})
  return {}
}

async function routeAccountDelete(
  reqMsg: IncomingMessage,
): Promise<TriggerResponse> {
  const event = await readJson<AccountDeleteEvent>(reqMsg)
  const username = event.user?.username
  // Devvit marks `user` as optional on this event — without a username
  // there's nothing to key our Redis entries on, so just no-op rather
  // than guess. (userId alone can't help here: boards are keyed by
  // username, not t2_id.)
  if (username) await dbRemoveUser(username)
  return {}
}

/** Fires every 15 minutes (see devvit.json's cron), but only actually
 *  posts once — dbShouldPostDaily() checks the real ET wall-clock
 *  hour and atomically claims the day, so of the ~4 checks that land
 *  inside the 6am ET hour, exactly one proceeds past this point.
 *  Unstickying the previous day's post is best-effort: if it's
 *  already gone or the call fails for any reason, that shouldn't
 *  block today's post from going up. */
async function routeSchedulerDailyPost(): Promise<TriggerResponse> {
  const shouldPost = await dbShouldPostDaily()
  if (!shouldPost) return {}

  const prevId = await dbGetDailyPostId()
  if (prevId) {
    try {
      const prevPost = await reddit.getPostById(prevId as `t3_${string}`)
      await prevPost.unsticky()
    } catch (err) {
      console.error(
        'routeSchedulerDailyPost: failed to unsticky previous post',
        err,
      )
    }
  }

  const post = await reddit.submitCustomPost({title: context.appSlug})
  await dbSetDailyPostId(post.id)
  try {
    await post.sticky()
  } catch (err) {
    console.error('routeSchedulerDailyPost: failed to sticky new post', err)
  }
  return {}
}

/** Fires roughly weekly (see devvit.json's cron; dbShouldRunWeeklySweep
 *  is defensive insurance against a duplicate firing, not the actual
 *  cadence). This is the real substitute for the AccountDelete trigger
 *  this app can't register (unsupported in this Devvit generation,
 *  confirmed against the actual schema) — instead of reacting to a
 *  deletion event, this actively checks every username currently
 *  stored against Reddit and purges anyone who no longer resolves.
 *  reddit.getUserByUsername returns undefined for a deleted or
 *  suspended account. */
async function routeSchedulerDeletedUserSweep(): Promise<TriggerResponse> {
  const shouldRun = await dbShouldRunWeeklySweep()
  if (!shouldRun) return {}

  const {checked, removed} = await dbSweepDeletedUsers(async username => {
    const user = await reddit.getUserByUsername(username)
    return user !== undefined
  })
  console.log(
    `routeSchedulerDeletedUserSweep: checked ${checked}, removed ${removed}`,
  )
  return {}
}

async function readJson<T>(reqMsg: IncomingMessage): Promise<T> {
  const chunks: Uint8Array[] = []
  reqMsg.on('data', chunk => chunks.push(chunk))
  await once(reqMsg, 'end')
  return JSON.parse(`${Buffer.concat(chunks)}`)
}

function writeJson<T extends PartialJsonValue>(
  status: number,
  json: Readonly<T>,
  rsp: ServerResponse,
): void {
  const body = JSON.stringify(json)
  const len = Buffer.byteLength(body)
  rsp.writeHead(status, {
    'Content-Length': len,
    'Content-Type': 'application/json',
  })
  rsp.end(body)
}




