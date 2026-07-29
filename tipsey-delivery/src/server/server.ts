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
  dbGetTop,
  dbGetTpProfile,
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

type AnyRsp =
  | GetDailyBestRsp
  | SubmitDailyBestRsp
  | GetHistoryRsp
  | SubmitReplayRsp
  | TpProfileRsp
  | PurchaseSkinRsp
  | EquipSkinRsp
  | ClaimTrophyRewardRsp
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
  const [best, top, allTimeBest, allTimeTop, user] = await Promise.all([
    dbGetDailyBest(dateStr),
    dbGetTop(dateStr, 10),
    dbGetAllTimeBest(),
    dbGetAllTimeTop(10),
    getCurrentUserRetrying(),
  ])
  return {
    dateStr,
    best,
    viewerUsername: user?.username ?? null,
    top,
    allTime: {best: allTimeBest, top: allTimeTop},
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
  return {owned: result.profile.owned, skinId: result.skinId}
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




