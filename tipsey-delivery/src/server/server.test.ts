import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import type {AddressInfo, Server} from 'node:net'
import {after, before, beforeEach, test} from 'node:test'
import {type Context, redis, runWithContext} from '@devvit/web/server'
import {
  Endpoint,
  type ErrorRsp,
  type GetDailyBestRsp,
  type SubmitDailyBestReq,
  type SubmitDailyBestRsp,
} from '../shared/api.ts'
import {onReq} from './server.ts'

let server: Server
let serverURL: string
const redisValues = new Map<string, string>()
const redisGet = redis.get.bind(redis)
const redisSet = redis.set.bind(redis)
before(async () => {
  redis.get = async key => redisValues.get(key)
  redis.set = async (key, value) => {
    redisValues.set(key, value as string)
    return 'OK'
  }
  server = createServer(async (req, rsp) => {
    await runWithContext(
      {
        appName: 'tipsey-delivery',
        postId: 't3_123',
        userId: 't2_123',
        username: 'username',
      } as unknown as Context,
      () => onReq(req, rsp),
    )
  })
  await new Promise<void>(resolve => {
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const info = server.address() as AddressInfo
  serverURL = `http://127.0.0.1:${info.port}`
})
after(async () => {
  redis.get = redisGet
  redis.set = redisSet
  if (!server.listening) return
  await new Promise<void>((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()))
  })
})
beforeEach(() => redisValues.clear())
test('get daily best — none set yet', async () => {
  const rsp = await fetch(`${serverURL}/${Endpoint.GetDailyBest}`)
  assert.equal(rsp.status, 200)
  assert.equal(rsp.headers.get('Content-Type'), 'application/json')
  const body = (await rsp.json()) as GetDailyBestRsp
  assert.equal(body.best, null)
})
test('submit daily best', async () => {
  const req: SubmitDailyBestReq = {tip: 4.5, ms: 42000}
  const rsp = await fetch(`${serverURL}/${Endpoint.SubmitDailyBest}`, {
    body: JSON.stringify(req),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(rsp.status, 200)
  assert.equal(rsp.headers.get('Content-Type'), 'application/json')
  const body = (await rsp.json()) as SubmitDailyBestRsp
  assert.equal(body.best?.tip, 4.5)
  assert.equal(body.best?.ms, 42000)
})
test('submit daily best — worse run does not overwrite the record', async () => {
  const better: SubmitDailyBestReq = {tip: 5, ms: 40000}
  await fetch(`${serverURL}/${Endpoint.SubmitDailyBest}`, {
    body: JSON.stringify(better),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  const worse: SubmitDailyBestReq = {tip: 3, ms: 50000}
  const rsp = await fetch(`${serverURL}/${Endpoint.SubmitDailyBest}`, {
    body: JSON.stringify(worse),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  const body = (await rsp.json()) as SubmitDailyBestRsp
  assert.equal(body.best?.tip, 5)
})
test('wrong method', async () => {
  const rsp = await fetch(`${serverURL}/${Endpoint.SubmitDailyBest}`)
  assert.equal(rsp.status, 404)
  assert.deepEqual<ErrorRsp>(await rsp.json(), {
    error: 'not found',
    status: 404,
  })
})
test('404', async () => {
  const rsp = await fetch(serverURL)
  assert.equal(rsp.status, 404)
  assert.deepEqual<ErrorRsp>(await rsp.json(), {
    error: 'not found',
    status: 404,
  })
})
