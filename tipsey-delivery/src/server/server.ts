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
  type ClaimSlalomTipReq,
  type ClaimSlalomTipRsp,
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
  type FollowRsp,
  type GetDailyBestRsp,
  type GetHistoryRsp,
  type PostFailCommentReq,
  type PostFailCommentRsp,
  type PostSlalomWinCommentReq,
  type PostSlalomWinCommentRsp,
  type PostWinCommentReq,
  type PostWinCommentRsp,
  type PurchaseSkinReq,
  type PurchaseSkinRsp,
  type SubmitDailyBestReq,
  type SubmitDailyBestRsp,
  type SubmitFailReq,
  type SubmitFailRsp,
  type SubmitReplayReq,
  type SubmitReplayRsp,
  type SubmitSlalomWinReq,
  type SubmitSlalomWinRsp,
  type SubmitWinReq,
  type SubmitWinRsp,
  type TpProfileRsp,
} from '../shared/api.ts'
import {
  dbClaimFollowBonus,
  dbClaimSlalomTip,
  dbClaimTrophyReward,
  dbClaimCommentBonus,
  dbEquipSkin,
  dbGetAllTimeBest,
  dbGetAllTimeTop,
  dbGetDailyBest,
  dbGetDailyPostId,
  dbGetHistory,
  dbGetPlays,
  dbGetStickyCommentId,
  dbGetTop,
  dbGetTpProfile,
  dbIncrPlays,
  dbMarkAnnounced,
  dbPurchaseSkin,
  dbRecordMission,
  dbReleaseDailyPostClaim,
  dbRemoveUser,
  dbSetDailyPostId,
  dbSetStickyCommentId,
  dbShouldPostDaily,
  dbShouldPostOnInstall,
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
  | ClaimSlalomTipRsp
  | SubmitFailRsp
  | PostFailCommentRsp
  | FollowRsp
  | SubmitWinRsp
  | PostWinCommentRsp
  | SubmitSlalomWinRsp
  | PostSlalomWinCommentRsp
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
      case Endpoint.ClaimSlalomTip:
        rsp = await routeClaimSlalomTip(reqMsg)
        break
      case Endpoint.CountPlay:
        rsp = await routeCountPlay()
        break
      case Endpoint.SubmitFail:
        rsp = await routeSubmitFail(reqMsg)
        break
      case Endpoint.PostFailComment:
        rsp = await routePostFailComment(reqMsg)
        break
      case Endpoint.Follow:
        rsp = await routeFollow()
        break
      case Endpoint.SubmitWin:
        rsp = await routeSubmitWin(reqMsg)
        break
      case Endpoint.PostWinComment:
        rsp = await routePostWinComment(reqMsg)
        break
      case Endpoint.SubmitSlalomWin:
        rsp = await routeSubmitSlalomWin(reqMsg)
        break
      case Endpoint.PostSlalomWinComment:
        rsp = await routePostSlalomWinComment(reqMsg)
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
  console.error(
    'getCurrentUser() failed after 3 attempts -- falling back to anonymous',
  )
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
    const result = await dbSubmitReplayScore(
      req.dateStr,
      req.tip,
      req.ms,
      username,
    )
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
    console.error(
      `routePurchaseSkin: ${username} -> ${req.skinId}: ${result.error}`,
    )
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
    console.error(
      `routeEquipSkin: ${username} -> ${req.skinId}: ${result.error}`,
    )
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
    console.error(
      `routeClaimTrophyReward: ${username} -> ${req.trophyId}: ${result.error}`,
    )
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
    console.error(
      `routeCompleteMission: ${username} -> ${req.missionId}: ${result.error}`,
    )
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

/** Pays the slalom tip into the wallet. The date is the SERVER's
 *  todayUTC(), same rule routeSubmitDailyBest states: a client-supplied
 *  date would let any webview pad an arbitrary day's high-water.
 *  Amount validation, the daily cap and the improvement-only delta all
 *  live in dbClaimSlalomTip; a repeat run that didn't beat the day's
 *  payout comes back credited: 0 with the unchanged balance, which is a
 *  success, not an error -- the client renders it as "already paid". */
async function routeClaimSlalomTip(
  reqMsg: IncomingMessage,
): Promise<ClaimSlalomTipRsp | ErrorRsp> {
  const req = await readJson<ClaimSlalomTipReq>(reqMsg)
  const user = await getCurrentUserRetrying()
  const username = user?.username ?? 'anonymous'
  const cents = typeof req.cents === 'number' ? req.cents : 0
  return await dbClaimSlalomTip(username, todayUTC(), cents)
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

/** Composes the fail-comment DRAFT and posts NOTHING -- the player
 *  edits and posts it themselves via PostFailComment, from an explicit
 *  button, per Devvit's user-actions rules (no automated actions).
 *  The server still owns every templated word (FAIL_CAUSE_COPY +
 *  sanitizeLabel) so the pre-filled text is always sane.
 *  context.postId is absent outside a post context (and the username
 *  is absent for a logged-out viewer) -- both are ordinary conditions,
 *  not errors, so they just return an empty draft. */
async function routeSubmitFail(
  reqMsg: IncomingMessage,
): Promise<SubmitFailRsp> {
  const req = await readJson<SubmitFailReq>(reqMsg)
  const postId = context.postId
  if (!postId) return {text: ''}

  const user = await getCurrentUserRetrying()
  if (!user?.username) return {text: ''}

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

  return {text}
}

/** Posts the player's (possibly edited) fail comment as the USER, in
 *  reply to the pinned anchor. Only ever reached by an explicit
 *  COMMENT -> POST press in the fail overlay -- the manual choice
 *  Devvit's user-actions rules require. The draft came from
 *  routeSubmitFail, but the player may have rewritten it entirely:
 *  that's fine, it lands under THEIR name via runAs USER, so it is
 *  their comment, not the app speaking. Clamped to 480 chars and
 *  stripped of control characters; markdown and mentions are left
 *  alone the same way Reddit's own composer would leave them. */
async function routePostFailComment(
  reqMsg: IncomingMessage,
): Promise<PostFailCommentRsp> {
  const req = await readJson<PostFailCommentReq>(reqMsg)
  const user = await getCurrentUserRetrying()
  if (!user?.username) return {posted: false}
  const raw = typeof req.text === 'string' ? req.text : ''
  const text = Array.from(raw)
    .filter(ch => {
      const c = ch.codePointAt(0) ?? 0
      // keep tab + newline + printable; drop other control chars incl. DEL
      return c === 9 || c === 10 || (c >= 32 && c !== 127)
    })
    .join('')
    .trim()
    .slice(0, 480)
  if (!text) return {posted: false}
  return {posted: await postScoreComment(text)}
}

/** Composes the win-comment DRAFT and posts NOTHING -- same
 *  no-automated-actions rule as routeSubmitFail. context.postId absent
 *  (outside a post context) or no resolvable username are both ordinary
 *  conditions, not errors -- just an empty draft, which hides the
 *  COMMENT button client-side. */
async function routeSubmitWin(reqMsg: IncomingMessage): Promise<SubmitWinRsp> {
  const req = await readJson<SubmitWinReq>(reqMsg)
  const postId = context.postId
  if (!postId) return {text: ''}

  const user = await getCurrentUserRetrying()
  if (!user?.username) return {text: ''}

  const address = sanitizeLabel(req.address, 48)
  const hood = sanitizeLabel(req.hood, 32)
  const pct = Math.round(clampNum(req.pct, 0, 22))
  const tip = clampNum(req.tip, 0, 9999)
  const secs = clampNum(req.ms, 0, 3_600_000) / 1000

  const where = address
    ? `to ${address}${hood ? ` (${hood})` : ''}`
    : 'to the door'

  const text =
    `**u/${user.username}** delivered ${where} -- ${pct}% tip, $${tip.toFixed(2)}.\n\n` +
    `${secs.toFixed(1)}s on the clock.`

  return {text}
}

/** Posts the player's (possibly edited) win comment as the USER, in
 *  reply to the pinned anchor -- same manual-POST-press contract as
 *  routePostFailComment. The $5/day bonus is claimed in THIS call,
 *  strictly after postScoreComment resolves true: no comment, no pay,
 *  same doctrine routeFollow uses for the subscribe-then-pay order.
 *  dbClaimWinCommentBonus's own hSetNX is still the real double-pay
 *  guard underneath this -- the ordering here just means a failed
 *  Reddit post can never draw a bonus in the first place. */
async function routePostWinComment(
  reqMsg: IncomingMessage,
): Promise<PostWinCommentRsp> {
  const req = await readJson<PostWinCommentReq>(reqMsg)
  const user = await getCurrentUserRetrying()
  if (!user?.username) return {posted: false, bonusGranted: false, walletCents: 0}
  const raw = typeof req.text === 'string' ? req.text : ''
  const text = Array.from(raw)
    .filter(ch => {
      const c = ch.codePointAt(0) ?? 0
      return c === 9 || c === 10 || (c >= 32 && c !== 127)
    })
    .join('')
    .trim()
    .slice(0, 480)
  if (!text) return {posted: false, bonusGranted: false, walletCents: 0}

  const posted = await postScoreComment(text)
  if (!posted) return {posted: false, bonusGranted: false, walletCents: 0}

  const {granted, walletCents} = await dbClaimCommentBonus(
    user.username,
    todayUTC(),
    'win',
  )
  return {posted: true, bonusGranted: granted, walletCents}
}

/** Composes the cone-slalom win-comment DRAFT and posts NOTHING -- same
 *  no-automated-actions rule as routeSubmitWin/routeSubmitFail. Unlike
 *  the delivery win, there's no address/hood to reference (the slalom
 *  course isn't tied to a street), so the draft leans on the run's own
 *  numbers instead: total time, margin against par, and whether it was
 *  a clean run (no faults). context.postId absent or no resolvable
 *  username are both ordinary conditions -- just an empty draft, which
 *  hides the COMMENT button client-side. */
async function routeSubmitSlalomWin(
  reqMsg: IncomingMessage,
): Promise<SubmitSlalomWinRsp> {
  const req = await readJson<SubmitSlalomWinReq>(reqMsg)
  const postId = context.postId
  if (!postId) return {text: ''}

  const user = await getCurrentUserRetrying()
  if (!user?.username) return {text: ''}

  const total = clampNum(req.totalSecs, 0, 3600)
  const par = clampNum(req.parSecs, 0, 3600)
  const clean = req.clean === true
  const margin = par - total
  const marginTxt =
    margin >= 0
      ? `${margin.toFixed(2)}s under par`
      : `${Math.abs(margin).toFixed(2)}s over par`

  const text =
    `**u/${user.username}** cleared the Cone Slalom${clean ? ' -- CLEAN RUN' : ''} -- ` +
    `${total.toFixed(2)}s (${marginTxt}).`

  return {text}
}

/** Posts the player's (possibly edited) slalom win comment as the USER,
 *  in reply to the pinned anchor -- same manual-POST-press contract as
 *  routePostWinComment. The $5/day bonus is claimed with source:'slalom'
 *  -- a SEPARATE pool from the delivery win's source:'win' (Sir's call:
 *  finishing both in one day pays both), same hSetNX atomicity either
 *  way. Strictly gated behind postScoreComment resolving true, same
 *  no-comment-no-pay doctrine as every other bonus here. */
async function routePostSlalomWinComment(
  reqMsg: IncomingMessage,
): Promise<PostSlalomWinCommentRsp> {
  const req = await readJson<PostSlalomWinCommentReq>(reqMsg)
  const user = await getCurrentUserRetrying()
  if (!user?.username) return {posted: false, bonusGranted: false, walletCents: 0}
  const raw = typeof req.text === 'string' ? req.text : ''
  const text = Array.from(raw)
    .filter(ch => {
      const c = ch.codePointAt(0) ?? 0
      return c === 9 || c === 10 || (c >= 32 && c !== 127)
    })
    .join('')
    .trim()
    .slice(0, 480)
  if (!text) return {posted: false, bonusGranted: false, walletCents: 0}

  const posted = await postScoreComment(text)
  if (!posted) return {posted: false, bonusGranted: false, walletCents: 0}

  const {granted, walletCents} = await dbClaimCommentBonus(
    user.username,
    todayUTC(),
    'slalom',
  )
  return {posted: true, bonusGranted: granted, walletCents}
}

/** Subscribes the pressing user to the current subreddit and grants
 *  the one-time $25.00 follow bonus. subscribeToCurrentSubreddit acts
 *  on the USER because SUBSCRIBE_TO_SUBREDDIT is declared in
 *  devvit.json's asUser (same pattern as Reddit's own HotAndCold app).
 *  Only reachable from the FOLLOW button, with MAYBE LATER as the
 *  opt-out -- explicit manual action, never automated. The bonus grant
 *  sits BEHIND the subscribe call on purpose: no follow, no pay; and
 *  dbClaimFollowBonus's hSetNX means a re-follow (or a cleared-storage
 *  re-prompt) can't double-pay. */
async function routeFollow(): Promise<FollowRsp> {
  const user = await getCurrentUserRetrying()
  if (!user?.username) return {joined: false, granted: false, walletCents: 0}
  try {
    await reddit.subscribeToCurrentSubreddit()
  } catch (err) {
    console.error('routeFollow: subscribe failed', err)
    return {joined: false, granted: false, walletCents: 0}
  }
  const {granted, walletCents} = await dbClaimFollowBonus(user.username)
  return {joined: true, granted, walletCents}
}

/** The one top-level comment the app account still leaves: the anchor
 *  every automated score/milestone reply threads under. Server-owned
 *  text, same rule as FAIL_CAUSE_COPY. */
const SCORE_ANCHOR_TEXT =
  '📬 **Tipsey delivery log** -- crash reports, trophies and ' +
  'milestones from the game land as replies here.'

/** Posts the anchor comment as the app account, stickies it
 *  (best-effort -- distinguish needs the app account's mod bit, and a
 *  failure there still leaves a perfectly good thread parent), and
 *  records its id so replies can find it. Returns null only when the
 *  comment itself couldn't be created. */
async function createScoreAnchor(
  postId: `t3_${string}`,
): Promise<string | null> {
  try {
    const comment = await reddit.submitComment({
      id: postId,
      text: SCORE_ANCHOR_TEXT,
    })
    try {
      await comment.distinguish(true)
    } catch (err) {
      console.error('createScoreAnchor: distinguish/sticky failed', err)
    }
    await dbSetStickyCommentId(postId, comment.id)
    return comment.id
  } catch (err) {
    console.error('createScoreAnchor: submitComment failed', err)
    return null
  }
}

/** Every automated score/milestone comment goes through here. Per
 *  r/Devvit's app-review requirement, these post as the PLAYER
 *  (runAs USER -- declared in devvit.json's asUser permission) in reply
 *  to the post's pinned anchor, never as top-level app-account
 *  comments. The anchor is created lazily so posts that predate this
 *  change (or whose creation-time anchor failed) still get one on the
 *  first reply. postId is absent outside a post context, which is an
 *  ordinary condition rather than an error. A throw is logged and
 *  swallowed on purpose: the caller is always mid-gameplay (crashing,
 *  buying, claiming), and a toast about Reddit's rate limiter would
 *  interrupt something the player cares about to report something
 *  they don't. */
async function postScoreComment(text: string): Promise<boolean> {
  const postId = context.postId
  if (!postId) return false
  try {
    let anchorId = await dbGetStickyCommentId(postId)
    if (!anchorId) anchorId = await createScoreAnchor(postId as `t3_${string}`)
    if (!anchorId) return false
    await reddit.submitComment({
      id: anchorId as `t1_${string}`,
      text,
      runAs: 'USER',
    })
    return true
  } catch (err) {
    console.error('postScoreComment: submitComment failed', err)
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
  await postScoreComment(text)
}

async function routeMenuNewPost(): Promise<UiResponse> {
  const post = await reddit.submitCustomPost({title: context.appSlug})
  await createScoreAnchor(post.id)
  return {
    showToast: {text: `Post ${post.id} created.`, appearance: 'success'},
    navigateTo: post.url,
  }
}

/** Fires on every install — including every redeploy's `devvit install`,
 *  which is why this used to be the real source of duplicate posts:
 *  it submitted unconditionally, so a day could end up with the
 *  scheduler's post plus one per reinstall. It now claims today's slot
 *  through the same key the scheduler uses, so a fresh install still
 *  gets an immediate post but a reinstall on an already-posted day is
 *  a no-op. */
async function routeAppInstall(): Promise<TriggerResponse> {
  if (!(await dbShouldPostOnInstall())) return {}
  await submitDailyPost()
  return {}
}

/** Submit the daily post and record its id so tomorrow's run can
 *  unsticky it. Releases the day's claim if the submit itself fails —
 *  otherwise one transient Reddit error would burn the whole day. */
async function submitDailyPost(): Promise<void> {
  let post
  try {
    post = await reddit.submitCustomPost({title: context.appSlug})
  } catch (err) {
    await dbReleaseDailyPostClaim()
    throw err
  }
  await dbSetDailyPostId(post.id)
  try {
    await post.sticky()
  } catch (err) {
    console.error('submitDailyPost: failed to sticky new post', err)
  }
  await createScoreAnchor(post.id)
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
 *  posts once — dbShouldPostDaily() checks the UTC wall-clock hour and
 *  atomically claims the day, so of the four checks that land inside
 *  hour 0 UTC, exactly one proceeds past this point. Hour 0 UTC is
 *  deliberate: that is the same instant clientTodayUTC() rolls the
 *  route seed, so the post announcing the new map goes up with the map
 *  rather than hours behind it.
 *
 *  Unstickying the previous day's post is best-effort: if it's already
 *  gone or the call fails for any reason, that shouldn't block today's
 *  post from going up. */
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

  await submitDailyPost()
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
