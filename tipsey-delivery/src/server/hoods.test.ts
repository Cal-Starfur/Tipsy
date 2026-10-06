import assert from 'node:assert/strict'
import {beforeEach, test} from 'node:test'
import {redis} from '@devvit/web/server'
import {dbGetTpProfile, dbPurchaseHood, dbRecordLost} from './db.ts'
import {tsSuccessPct} from './tpcatalog.ts'

/* in-memory hashes: just the Redis calls the hood store path touches */
const H = new Map<string, Map<string, string>>()
const h = (k: string) => {
  let m = H.get(k)
  if (!m) {
    m = new Map()
    H.set(k, m)
  }
  return m
}
const r = redis as unknown as Record<string, unknown>
r.hGetAll = async (k: string) => Object.fromEntries(h(k))
r.hGet = async (k: string, f: string) => h(k).get(f)
r.hSet = async (k: string, o: Record<string, string>) => {
  for (const [f, v] of Object.entries(o)) h(k).set(f, v)
  return 1
}
r.hSetNX = async (k: string, f: string, v: string) => {
  if (h(k).has(f)) return 0
  h(k).set(f, v)
  return 1
}
r.hIncrBy = async (k: string, f: string, n: number) => {
  const v = (Number.parseInt(h(k).get(f) ?? '0', 10) || 0) + n
  h(k).set(f, String(v))
  return v
}
r.get = async () => undefined
beforeEach(() => H.clear())

const P = 'tipsy:global:tpprofile:u'
const seed = (wallet: number, deliveries?: number) => {
  h(P).set('walletCents', String(wallet))
  if (deliveries !== undefined) h(P).set('deliveries', String(deliveries))
}

test('new profile owns only The Flats', async () => {
  const p = await dbGetTpProfile('u')
  assert.deepEqual(p.hoodsOwned, [0])
  assert.equal(p.deliveries, 0)
})

test('locked hood is refused and nothing is charged', async () => {
  seed(100000, 9)
  const res = await dbPurchaseHood('u', 1)
  assert.equal(res.ok, false)
  assert.equal(h(P).get('walletCents'), '100000')
})

test('unlocked hood buys, charges the server price, and shows on the profile', async () => {
  seed(6000, 10)
  const res = await dbPurchaseHood('u', 1)
  assert.equal(res.ok, true)
  if (res.ok) {
    assert.deepEqual(res.profile.hoodsOwned, [0, 1])
    assert.equal(res.profile.walletCents, 1000)
  }
})

test('insufficient funds refunds and grants nothing', async () => {
  seed(4999, 10)
  const res = await dbPurchaseHood('u', 1)
  assert.equal(res.ok, false)
  assert.equal(h(P).get('walletCents'), '4999')
  assert.deepEqual((await dbGetTpProfile('u')).hoodsOwned, [0])
})

test('buying twice never charges twice', async () => {
  seed(20000, 10)
  assert.equal((await dbPurchaseHood('u', 1)).ok, true)
  assert.equal((await dbPurchaseHood('u', 1)).ok, false)
  assert.equal(h(P).get('walletCents'), '15000')
})

test('The Flats and unknown hoods are not for sale', async () => {
  seed(100000, 100)
  for (const i of [0, 12, -1, 1.5, Number.NaN]) {
    assert.equal((await dbPurchaseHood('u', i)).ok, false)
  }
  assert.equal(h(P).get('walletCents'), '100000')
})

test('an old profile is seeded from history days, once', async () => {
  seed(100000)
  h('tipsy:global:history:u').set('2026-09-01', '{"tipCents":1,"ms":1}')
  h('tipsy:global:history:u').set('2026-09-02', '{"tipCents":1,"ms":1}')
  assert.equal((await dbGetTpProfile('u')).deliveries, 2)
  h(P).set('deliveries', '10')
  assert.equal((await dbGetTpProfile('u')).deliveries, 10)
})

test('success % is delivered over delivered + lost, rounded down', () => {
  assert.equal(tsSuccessPct(0, 0), 100)
  assert.equal(tsSuccessPct(10, 0), 100)
  assert.equal(tsSuccessPct(7, 3), 70)
  assert.equal(tsSuccessPct(69, 31), 69)
  assert.equal(tsSuccessPct(2, 1), 66)
})

test('lost orders are counted, clamped to what one tip can lose', async () => {
  assert.equal(await dbRecordLost('u', 2), 2)
  assert.equal(await dbRecordLost('u', 99), 5)
  assert.equal(await dbRecordLost('u', 0), 6)
  assert.equal(await dbRecordLost('u', Number.NaN), 7)
  assert.equal((await dbGetTpProfile('u')).lost, 7)
})

test('a hood under its success bar is refused and nothing is charged', async () => {
  seed(100000, 10)
  h(P).set('lost', '7') // 10 / 17 = 58%, tier 1 needs 60
  const res = await dbPurchaseHood('u', 1)
  assert.equal(res.ok, false)
  if (!res.ok) assert.match(res.error, /60% success/)
  assert.equal(h(P).get('walletCents'), '100000')
})

test('a hood at its success bar buys', async () => {
  seed(100000, 30)
  h(P).set('lost', '20') // 30 / 50 = 60%
  assert.equal((await dbPurchaseHood('u', 1)).ok, true)
})
