import assert from 'node:assert/strict'
import {beforeEach, test} from 'node:test'
import {redis} from '@devvit/web/server'
import {
  dbClaimGiftTip,
  GIFT_TIP_CENTS,
  HEART_TIP_CENTS,
  HEART_TIP_ID,
} from './db.ts'

/* in-memory hashes: just the Redis calls the gift tip path touches */
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
r.hGet = async (k: string, f: string) => h(k).get(f)
r.hIncrBy = async (k: string, f: string, n: number) => {
  const v = (Number.parseInt(h(k).get(f) ?? '0', 10) || 0) + n
  h(k).set(f, String(v))
  return v
}
beforeEach(() => H.clear())

const P = 'tipsy:global:tpprofile:u'

test('a tip envelope pays the server amount once', async () => {
  h(P).set('walletCents', '100')
  const a = await dbClaimGiftTip('u', 'g4tips')
  assert.deepEqual(a, {
    credited: GIFT_TIP_CENTS,
    walletCents: 100 + GIFT_TIP_CENTS,
  })
  const b = await dbClaimGiftTip('u', 'g4tips')
  assert.deepEqual(b, {credited: 0, walletCents: 100 + GIFT_TIP_CENTS})
})

test('each envelope is its own claim', async () => {
  await dbClaimGiftTip('u', 'g1tips')
  const b = await dbClaimGiftTip('u', 'g8tips')
  assert.equal(b.credited, GIFT_TIP_CENTS)
  assert.equal(b.walletCents, 2 * GIFT_TIP_CENTS)
})

test('an unknown or non-tip id pays nothing', async () => {
  for (const id of ['g7tips', 'g4charge', 'tips', '', 'g4tips ']) {
    const res = await dbClaimGiftTip('u', id)
    assert.equal(res.credited, 0)
  }
  assert.equal(h(P).get('walletCents'), undefined)
})

test('the heart run pays its own amount, once', async () => {
  const a = await dbClaimGiftTip('u', HEART_TIP_ID)
  assert.deepEqual(a, {credited: HEART_TIP_CENTS, walletCents: HEART_TIP_CENTS})
  const b = await dbClaimGiftTip('u', HEART_TIP_ID)
  assert.equal(b.credited, 0)
  assert.equal(b.walletCents, HEART_TIP_CENTS)
})
