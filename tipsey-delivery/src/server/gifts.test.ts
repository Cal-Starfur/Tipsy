import assert from 'node:assert/strict'
import {beforeEach, test} from 'node:test'
import {redis} from '@devvit/web/server'
import {
  DOG_RESCUE_CENTS,
  DOG_RESCUE_MAX_PER_DAY,
  dbClaimDogRescue,
  dbClaimGiftTip,
  dbClaimLostReturn,
  GIFT_TIP_CENTS,
  HEART_TIP_CENTS,
  HEART_TIP_ID,
  LOST_RETURN_CENTS,
  LOST_SLOTS,
  WORLD_TIP_SLOTS,
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
r.expire = async () => undefined
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

/* THE LOST DOGS' TIPS (dbClaimDogRescue): each rescue pays the server's
   amount up to the day's cap; past it the rescue still counts */
test('a lost dog brought home pays the server amount, so many a day', async () => {
  h(P).set('walletCents', '100')
  const a = await dbClaimDogRescue('u', '2026-10-24')
  assert.deepEqual(a, {
    credited: DOG_RESCUE_CENTS,
    walletCents: 100 + DOG_RESCUE_CENTS,
    dogsRescued: 1,
  })
  for (let i = 1; i < DOG_RESCUE_MAX_PER_DAY; i++)
    await dbClaimDogRescue('u', '2026-10-24')
  const over = await dbClaimDogRescue('u', '2026-10-24')
  assert.equal(over.credited, 0)
  assert.equal(
    over.walletCents,
    100 + DOG_RESCUE_CENTS * DOG_RESCUE_MAX_PER_DAY,
  )
  assert.equal(over.dogsRescued, DOG_RESCUE_MAX_PER_DAY + 1)
  /* a new day: the cap is the day's, the count is for life */
  const next = await dbClaimDogRescue('u', '2026-10-25')
  assert.equal(next.credited, DOG_RESCUE_CENTS)
  assert.equal(next.dogsRescued, DOG_RESCUE_MAX_PER_DAY + 2)
})

/* THE WORLD'S ENVELOPES (GIFT_WORLD): 'w<hood>.<slot>', once per slot per
   day, WORLD_TIP_SLOTS a hood, only in a hood the player owns */
test('a world envelope pays once a day per slot', async () => {
  const a = await dbClaimGiftTip('u', 'w0.3', '2026-10-30')
  assert.equal(a.credited, GIFT_TIP_CENTS)
  const b = await dbClaimGiftTip('u', 'w0.3', '2026-10-30')
  assert.equal(b.credited, 0)
  const c = await dbClaimGiftTip('u', 'w0.4', '2026-10-30')
  assert.equal(c.credited, GIFT_TIP_CENTS)
  /* the next day the same slot is a new envelope */
  const d = await dbClaimGiftTip('u', 'w0.3', '2026-10-31')
  assert.equal(d.credited, GIFT_TIP_CENTS)
  assert.equal(d.walletCents, 3 * GIFT_TIP_CENTS)
})

test('a world envelope past the slots, or in a hood not owned, pays nothing', async () => {
  for (const id of [
    `w0.${WORLD_TIP_SLOTS}`,
    'w0.99',
    'w12.0',
    'w1.0',
    'w0',
    'w0.-1',
    'w0.1 ',
    'wx.1',
  ])
    assert.equal((await dbClaimGiftTip('u', id, '2026-10-30')).credited, 0)
  h('tipsy:global:tphoods:u').set('1', '1')
  assert.equal(
    (await dbClaimGiftTip('u', 'w1.0', '2026-10-30')).credited,
    GIFT_TIP_CENTS,
  )
})

/* LOST ITEMS: each returned thing pays its kind once, ever, within the day
   window, in a hood the player owns */
test('a lost thing returned pays its kind once', async () => {
  h(P).set('walletCents', '0')
  const a = await dbClaimLostReturn('u', 'l20261031.0.wallet.2', '2026-10-31')
  assert.deepEqual(a, {credited: LOST_RETURN_CENTS.wallet, walletCents: 500})
  const b = await dbClaimLostReturn('u', 'l20261031.0.wallet.2', '2026-10-31')
  assert.deepEqual(b, {credited: 0, walletCents: 500})
  /* the same slot, its kind forged: still the one item */
  const c = await dbClaimLostReturn('u', 'l20261031.0.phone.2', '2026-10-31')
  assert.equal(c.credited, 0)
  /* carried over from yesterday: paid, once */
  const d = await dbClaimLostReturn('u', 'l20261030.0.keys.1', '2026-10-31')
  assert.equal(d.credited, LOST_RETURN_CENTS.keys)
  const e = await dbClaimLostReturn('u', 'l20261030.0.keys.1', '2026-11-01')
  assert.equal(e.credited, 0)
})

test('a lost thing out of the window, past the slots or not owned pays nothing', async () => {
  for (const id of [
    'l20261025.0.wallet.0',
    'l20261101.0.wallet.0',
    `l20261031.0.wallet.${LOST_SLOTS}`,
    'l20261031.0.diamond.0',
    'l20261031.1.wallet.0',
    'l20261031.12.wallet.0',
    'l2026103.0.wallet.0',
    'w0.1',
    '',
  ])
    assert.equal((await dbClaimLostReturn('u', id, '2026-10-31')).credited, 0)
  h('tipsy:global:tphoods:u').set('1', '1')
  const f = await dbClaimLostReturn('u', 'l20261031.1.lunch.0', '2026-10-31')
  assert.equal(f.credited, LOST_RETURN_CENTS.lunch)
})
