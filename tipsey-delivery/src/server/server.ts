import {once} from 'node:events'
import type {IncomingMessage, ServerResponse} from 'node:http'
import {context, reddit} from '@devvit/web/server'
import type {
  PartialJsonValue,
  TriggerResponse,
  UiResponse,
} from '@devvit/web/shared'
import {
  Endpoint,
  EndpointMethod,
  type ErrorRsp,
  type GetDailyBestRsp,
  type SubmitDailyBestReq,
  type SubmitDailyBestRsp,
} from '../shared/api.ts'
import {
  dbGetAllTimeBest,
  dbGetAllTimeTop,
  dbGetDailyBest,
  dbGetTop,
  dbSubmitScore,
  todayUTC,
} from './db.ts'

type AnyRsp =
  | GetDailyBestRsp
  | SubmitDailyBestRsp
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
      case Endpoint.OnMenuNewPost:
        rsp = await routeMenuNewPost()
        break
      case Endpoint.OnAppInstall:
        rsp = await routeAppInstall()
        break
      default:
        endpoint satisfies never
        rsp = {error: 'not found', status: 404}
        break
    }
  }

  writeJson<PartialJsonValue>('status' in rsp ? rsp.status : 200, rsp, rspMsg)
}

async function routeGetDailyBest(): Promise<GetDailyBestRsp> {
  const dateStr = todayUTC()
  const [best, top, allTimeBest, allTimeTop, user] = await Promise.all([
    dbGetDailyBest(dateStr),
    dbGetTop(dateStr, 10),
    dbGetAllTimeBest(),
    dbGetAllTimeTop(10),
    reddit.getCurrentUser().catch(() => null),
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
  const user = await reddit.getCurrentUser().catch(() => null)
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
