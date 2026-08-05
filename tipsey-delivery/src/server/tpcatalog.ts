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

/** Side missions the server keeps a record for. `best` is a monotonic
 *  high-water counter, not a boolean, because the one shipped mission
 *  is scored by how far you got: the Hydrant Challenge banks every
 *  cleared jump, and hydrant-hop's trophy card reads that same number
 *  as progress (0-10) rather than a done flag. A pass/fail mission just
 *  sets bestMax and completeAt to 1 and uses it as a boolean.
 *
 *  bestMax is the clamp. The count is self-reported -- the server can't
 *  re-run the jump physics -- so this bounds what a forged report can
 *  claim to exactly what a real clear could have earned. It does not
 *  make the number trustworthy; see dbRecordMission's note. */
export type TsMissionDef = {
  bestMax: number
  completeAt: number
}

/** Must match TP_SIDE_MISSIONS in game/index.html by id. Only missions
 *  that are actually PLAYABLE belong here: a mission the shipped UI
 *  can't trigger has nothing to record, and listing it would let a
 *  hand-made request bank progress on a course that doesn't exist yet.
 *  cone-slalom is listed because its trophy is already wired to it and
 *  the mission is marked 'available' client-side; new-sweater-city,
 *  stunt-jump and challenge-1 are 'comingSoon' and deliberately absent.
 *
 *  completeAt for jump-hydrant is 10, matching HJ_CHIEF_AT in
 *  game/index.html -- all ten or nothing, since the Chief was
 *  deliberately moved off jump 8 to be the prize for the whole run. */
export const TS_MISSIONS: Record<string, TsMissionDef> = {
  'jump-hydrant': {bestMax: 10, completeAt: 10},
  'cone-slalom': {bestMax: 1, completeAt: 1},
}

/** missionId -> best count recorded for this player. */
export type TsMissionState = Record<string, number>

export function tsMissionComplete(
  missions: TsMissionState,
  missionId: string,
): boolean {
  const def = TS_MISSIONS[missionId]
  if (!def) return false
  return (missions[missionId] ?? 0) >= def.completeAt
}

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
 *  hydrant-hop and slalom-master WERE excluded here for want of a
 *  server-side mission record; CompleteMission and dbRecordMission now
 *  provide one, so they are listed below with the honest caveat that
 *  their evidence is weaker than the other two's. dbClaimTrophyReward
 *  still rejects any trophyId absent from this table -- stunt-jump
 *  stays out, since its challenge does not exist to complete.
 *  first-run, regular,
 *  bigtip, and speedrun are also absent -- not because they're
 *  unverifiable, but because they have no reward (reward: null in
 *  TP_TROPHIES), so there's nothing for this endpoint to grant. */
export const TS_CLAIMABLE_TROPHIES: Record<
  string,
  {
    rewardSkinId: string
    check: (
      history: readonly TsHistoryEntry[],
      allTimeTotal: number,
      missions: TsMissionState,
    ) => boolean
  }
> = {
  streak5: {rewardSkinId: 'palm-camo', check: history => tsLongestStreak(history) >= 5},
  highroller: {rewardSkinId: 'gold-rush', check: (_history, allTimeTotal) => allTimeTotal >= 500},
  /* Now claimable: the mission record these two read didn't exist when
     the note below was written. They are NOT verified the way streak5
     and highroller are -- those re-derive from server-owned score
     history, while these rest on a client-reported completion. What the
     record buys is that the claim is checked against something durable
     and server-side rather than against nothing at all. */
  'hydrant-hop': {
    rewardSkinId: 'fire-chief',
    check: (_h, _t, missions) => tsMissionComplete(missions, 'jump-hydrant'),
  },
  'slalom-master': {
    rewardSkinId: 'cone-dodger',
    check: (_h, _t, missions) => tsMissionComplete(missions, 'cone-slalom'),
  },
}
