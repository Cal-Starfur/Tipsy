/** Server-side mirror of game/index.html's TP_SKINS / TP_TROPHIES tables
 *  (search that file for "single source of truth for Trophy Case + Store
 *  + missions"). This file exists because game-logic.js/game/index.html
 *  aren't part of the TS build pipeline db.ts/server.ts use — so price
 *  and eligibility checks the server must never trust the client for
 *  need their own copy here. Known duplication cost, not fixed by this
 *  change: if a skin price or trophy rule changes client-side, this
 *  file has to be updated in the same commit or the two will drift.
 *
 *  Only the fields the server actually needs to validate are mirrored
 *  (price + unlockType for skins; reward + eligibility for trophies) --
 *  not display strings, filters, or descriptions, which stay purely a
 *  client rendering concern. */

export type TsSkinDef = {
  priceCents: number
  unlockType: 'free' | 'purchase' | 'achievement'
}

/** Must match TP_SKINS in game/index.html skin-for-skin. 'classic' is
 *  listed here (priceCents 0, unlockType 'free') for completeness even
 *  though db.ts never persists a Redis field for it -- see tpOwnedKey's
 *  comment. Achievement-type skins are listed too, purely so
 *  dbPurchaseSkin can reject a PurchaseSkin call against them with a
 *  clear error instead of silently letting someone buy a trophy skin
 *  for cash. */
export const TS_SKINS: Record<string, TsSkinDef> = {
  classic: {priceCents: 0, unlockType: 'free'},
  'sunset-cruiser': {priceCents: 1500, unlockType: 'purchase'},
  'neon-courier': {priceCents: 2500, unlockType: 'purchase'},
  'chrome-plate': {priceCents: 4500, unlockType: 'purchase'},
  'palm-camo': {priceCents: 0, unlockType: 'achievement'},
  'gold-rush': {priceCents: 0, unlockType: 'achievement'},
  'fire-chief': {priceCents: 0, unlockType: 'achievement'},
  'cone-dodger': {priceCents: 0, unlockType: 'achievement'},
}

export type TsHistoryEntry = {dateStr: string; tip: number; ms: number}

/** Ported verbatim from tpLongestStreak in game/index.html -- longest
 *  run of consecutive calendar days (UTC) this player has a history
 *  entry for. */
function tsLongestStreak(history: readonly TsHistoryEntry[]): number {
  if (!history.length) return 0
  const days = [...new Set(history.map(h => h.dateStr))].sort()
  let best = 1
  let run = 1
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(`${days[i - 1]}T00:00:00Z`).getTime()
    const cur = new Date(`${days[i]}T00:00:00Z`).getTime()
    if (cur - prev === 86_400_000) {
      run++
      best = Math.max(best, run)
    } else {
      run = 1
    }
  }
  return best
}

/** Only the trophies whose eligibility is fully derivable from
 *  dbGetHistory's own data (history + allTimeTotal) belong here.
 *  hydrant-hop and slalom-master are deliberately NOT listed: their
 *  progress depends on missionsCompleted, which has no server-side
 *  record yet (see server.ts/db.ts -- no CompleteMission endpoint
 *  exists, on purpose, until Phase C's real gameplay trigger exists).
 *  Claiming either through ClaimTrophyReward today would just be a
 *  free skin with no real gate behind it, so dbClaimTrophyReward
 *  rejects any trophyId not found in this table. first-run, regular,
 *  bigtip, and speedrun are also absent -- not because they're
 *  unverifiable, but because they have no reward (reward: null in
 *  TP_TROPHIES), so there's nothing for this endpoint to grant. */
export const TS_CLAIMABLE_TROPHIES: Record<
  string,
  {rewardSkinId: string; check: (history: readonly TsHistoryEntry[], allTimeTotal: number) => boolean}
> = {
  streak5: {rewardSkinId: 'palm-camo', check: history => tsLongestStreak(history) >= 5},
  highroller: {rewardSkinId: 'gold-rush', check: (_history, allTimeTotal) => allTimeTotal >= 500},
}
