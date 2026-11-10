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
  medic: {priceCents: 0, unlockType: 'achievement'},
  /* Luna's uniform's reward (the One of Us trophy, 'luna-favour') */
  goth: {priceCents: 0, unlockType: 'achievement'},
  /* Catch of the Day's reward (the Catch of the Day trophy, 'catch-of-the-day') */
  fishmonger: {priceCents: 0, unlockType: 'achievement'},
  /* Adoption Day's reward (the Adoption Day trophy, 'adoption-day') */
  pawprint: {priceCents: 0, unlockType: 'achievement'},
  /* The Getaway's reward (the Wheels Up trophy, 'wheels-up') */
  'just-married': {priceCents: 0, unlockType: 'achievement'},
  /* Number 4 Builds a Winner's reward (the Pit Crew trophy, 'pit-crew') */
  'racing-stripe': {priceCents: 0, unlockType: 'achievement'},
  /* Sunset Session's reward (the Sunset Session trophy, 'sunset-session') */
  'board-shorts': {priceCents: 0, unlockType: 'achievement'},
  /* Open House's reward (the Open House trophy, 'open-house') */
  'engine-red': {priceCents: 0, unlockType: 'achievement'},
  /* Letters on the Hill's reward (the Letters on the Hill trophy, 'letters-on-hill') */
  'costa-palma': {priceCents: 0, unlockType: 'achievement'},
  /* Night Watch's three, the patrol robot's own skins (TP_SKINS' fleet: worn only as the patrol robot), one trophy each */
  police: {priceCents: 0, unlockType: 'achievement'},
  sheriff: {priceCents: 0, unlockType: 'achievement'},
  security: {priceCents: 0, unlockType: 'achievement'},
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
  /* the heart run at Marina General: pass/fail, reported once the donor
     heart is on the ER's mat */
  'heart-run': {bestMax: 1, completeAt: 1},
  /* THE STORY MISSIONS (game/index.html MISSIONS, docs/kits/missions.md;
     LOOK_RULES 10, R10: what a mission gives is the server's). Each is
     pass/fail and played once; the client reports it with best 1 when its
     giver thanks Tipsey (missionComplete), and rebuilds what it gave from
     this record on every requestTpProfile:
       cake-run       the Gala Pass (a key item) and the bakery's orders
       mall-password  Gus's password: the mall's front doors
       goth-uniform   Luna's favour: the One of Us trophy (the Goth skin)
                      and her $100 (GIFT_TIP_IDS 'luna', paid once)
       arcade-card    High Tide's game card (its credits: dbArcade)
       fourth-place   the First Delivery trophy given to number 4
       lighthouse-run the first mission flown in a fleet vehicle (the
                      delivery drone, lent at the Fleet Station): Ines's
                      brass key (a key item), $50 once (GIFT_TIP_IDS
                      'lighthouse'), and the drone it keeps (FLEET unlock)
       catch-of-the-day  Nell's three kitchens in the Pelican Fish Market's
                      delivery pod: the Catch of the Day trophy (the
                      Fishmonger skin) and $50 once (GIFT_TIP_IDS 'fishmkt')
       adoption-day   Paw Point Dog Park's adoption day: the banner, the
                      treats, and Biscuit walked over by the fleet's humanoid
                      (lent for the run only; Minding the Shop keeps him); the Adoption Day
                      trophy (the Paw Print skin) and the Dog Rescuer's gold
                      tag (a key item, rebuilt from this record). Offered once
                      five strays are sheltered (dbShelterDog's count)
       minding-the-shop  Gideon's antenna at Brew & Bolt: Tipsey minds the
                      shop while Gideon (the fleet's humanoid, lent) fetches
                      the parts from Breakwater Hardware and mends the mast.
                      Its reward is Gideon himself, playable (the humanoid's
                      FLEET unlock, now this mission's alone): no trophy, skin or cash
       the-getaway    the Holloways' passports, Sun Deck Motor Lodge to the
                      airfield's terminal: the Wheels Up trophy (the Just
                      Married skin), $50 once (GIFT_TIP_IDS 'getaway'), the
                      robotaxi (FLEET unlock); it spends the Gala Pass
       kart-winner    Number 4 Builds a Winner (after fourth-place): number
                      4's race bib (a key item, rebuilt from this record:
                      kwBibMigrate) and the Pit Crew trophy, whose claim
                      grants the Racing Stripe skin
       night-watch    Night Watch at the Vista Ridge Security Post, after
                      dark (after goth-uniform): the east wall walked in the
                      post's patrol robot (lent, kept: FLEET unlock
                      'patrolbot'), Luna's fob from the mall's lost property,
                      $40 once (GIFT_TIP_IDS 'nightwatch') and her spare gate
                      fob (a key item, rebuilt from this record: nwFobMigrate)
       sunset-salute  Sunset Salute (at dusk, the Veterans Memorial): Walt's
                      challenge coin (a key item, rebuilt from this record:
                      ssCoinMigrate) and the autonomous shuttle (FLEET unlock)
       sunset-session Sunset Session (at dusk, Sunset Shore Surf School): six
                      foam boards down the sand in the lent cargo bot; the
                      Sunset Session trophy (its claim grants the Board Shorts
                      skin) and $50 once (GIFT_TIP_IDS 'surfschool')
       request-line   Request Line (KTDE 98.1 The Tide): Ollie's song for Maya
                      on the request show; $40 once (GIFT_TIP_IDS
                      'requestline') and the station's sticker (a key item,
                      rebuilt from this record: rlStickerMigrate)
       open-house     Open House (in the daytime, the Flats Fire Training
                      Yard): Tipsey's Fire helmet keepsake given to a junior
                      firefighter after a lap of the hose drill; the Open
                      House trophy (its claim grants the Engine Red skin) and
                      $40 once (GIFT_TIP_IDS 'openhouse')
       letters-on-hill Letters on the Hill (at dusk, the Costa Palma hillside
                      letters): the new A flown up on the Fleet's heavy-lift
                      drone; the Letters on the Hill trophy (its claim grants
                      the Costa Palma skin) and $50 once (GIFT_TIP_IDS
                      'letters') */
  'cake-run': {bestMax: 1, completeAt: 1},
  'mall-password': {bestMax: 1, completeAt: 1},
  'goth-uniform': {bestMax: 1, completeAt: 1},
  'arcade-card': {bestMax: 1, completeAt: 1},
  'fourth-place': {bestMax: 1, completeAt: 1},
  'lighthouse-run': {bestMax: 1, completeAt: 1},
  'catch-of-the-day': {bestMax: 1, completeAt: 1},
  'adoption-day': {bestMax: 1, completeAt: 1},
  'the-getaway': {bestMax: 1, completeAt: 1},
  'kart-winner': {bestMax: 1, completeAt: 1},
  'night-watch': {bestMax: 1, completeAt: 1},
  'sunset-salute': {bestMax: 1, completeAt: 1},
  'sunset-session': {bestMax: 1, completeAt: 1},
  'request-line': {bestMax: 1, completeAt: 1},
  'open-house': {bestMax: 1, completeAt: 1},
  'letters-on-hill': {bestMax: 1, completeAt: 1},
  'minding-the-shop': {bestMax: 1, completeAt: 1},
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
  /* the heart run's trophy (Lifeline), on the same client-reported
     completion as the two above */
  'heart-hero': {
    rewardSkinId: 'medic',
    check: (_h, _t, missions) => tsMissionComplete(missions, 'heart-run'),
  },
  /* Luna's uniform's trophy (One of Us), the same way */
  'luna-favour': {
    rewardSkinId: 'goth',
    check: (_h, _t, missions) => tsMissionComplete(missions, 'goth-uniform'),
  },
  /* Catch of the Day's trophy, the same way (the Fishmonger skin) */
  'catch-of-the-day': {
    rewardSkinId: 'fishmonger',
    check: (_h, _t, missions) => tsMissionComplete(missions, 'catch-of-the-day'),
  },
  /* Adoption Day's trophy, the same way (the Paw Print skin) */
  'adoption-day': {
    rewardSkinId: 'pawprint',
    check: (_h, _t, missions) => tsMissionComplete(missions, 'adoption-day'),
  },
  /* The Getaway's trophy (Wheels Up), the same way */
  'wheels-up': {
    rewardSkinId: 'just-married',
    check: (_h, _t, missions) => tsMissionComplete(missions, 'the-getaway'),
  },
  /* Number 4 Builds a Winner's trophy (Pit Crew), the same way */
  'pit-crew': {
    rewardSkinId: 'racing-stripe',
    check: (_h, _t, missions) => tsMissionComplete(missions, 'kart-winner'),
  },
  /* Sunset Session's trophy, the same way (the Board Shorts skin) */
  'sunset-session': {
    rewardSkinId: 'board-shorts',
    check: (_h, _t, missions) => tsMissionComplete(missions, 'sunset-session'),
  },
  /* Open House's trophy, the same way (the Engine Red skin) */
  'open-house': {
    rewardSkinId: 'engine-red',
    check: (_h, _t, missions) => tsMissionComplete(missions, 'open-house'),
  },
  /* Letters on the Hill's trophy, the same way (the Costa Palma skin) */
  'letters-on-hill': {
    rewardSkinId: 'costa-palma',
    check: (_h, _t, missions) => tsMissionComplete(missions, 'letters-on-hill'),
  },
  /* Night Watch's three trophies, the same way (the Police, Sheriff and Security skins: the patrol robot's own) */
  'night-watch': {
    rewardSkinId: 'police',
    check: (_h, _t, missions) => tsMissionComplete(missions, 'night-watch'),
  },
  'night-watch-sheriff': {
    rewardSkinId: 'sheriff',
    check: (_h, _t, missions) => tsMissionComplete(missions, 'night-watch'),
  },
  'night-watch-security': {
    rewardSkinId: 'security',
    check: (_h, _t, missions) => tsMissionComplete(missions, 'night-watch'),
  },
}

/** HIGH TIDE'S GAME CARD (game/index.html TIX): the credits Marisol puts on
 *  it once (grant, once per user, ever, after 'arcade-card' is recorded),
 *  and the top-up PLAY sells when it is empty -- the price and the count
 *  are the server's, never the client's. Keep in step with TIX_CREDITS
 *  and TIX_TOPUP in game/index.html. */
export const TS_ARCADE = {grantCredits: 30, topupCredits: 10, topupCents: 500}

/** Server-side mirror of HOOD_TIERS / HOOD_TIER_OF in game/index.html
 *  (search "THE HOOD STORE"). Same doctrine as TS_SKINS: price AND the
 *  unlock requirement are never taken from the client. Hybrid unlock
 *  (Sir, 2026-09-16): a hood is buyable once the player's lifetime
 *  delivery count reaches its tier's `deliveries`, and owned once paid
 *  for from the wallet. Index = HOODS index. Hood 0 (The Flats) is the
 *  starting hood -- owned by everyone, never sold, never stored.
 *  Must change in the same commit as the client table.
 *
 *  minSuccess (Sir, 2026-10-06): a tier also needs the player's lifetime
 *  success -- orders delivered against orders lost to a tip-over -- at or
 *  above this percent (see tsSuccessPct). */
export type TsHoodDef = {name: string; tier: number; deliveries: number; minSuccess: number; priceCents: number}
const TS_HOOD_TIERS: Record<number, {deliveries: number; minSuccess: number; priceCents: number}> = {
  1: {deliveries: 10, minSuccess: 60, priceCents: 5000},
  2: {deliveries: 30, minSuccess: 70, priceCents: 15000},
  3: {deliveries: 60, minSuccess: 80, priceCents: 40000},
  4: {deliveries: 100, minSuccess: 85, priceCents: 90000},
}
/** Lifetime success, a whole percent rounded DOWN so a tier's bar is
 *  never met by rounding: delivered / (delivered + lost). No runs yet is
 *  100. Mirrors tpSuccessPct in game/index.html. */
export function tsSuccessPct(delivered: number, lost: number): number {
  const runs = delivered + lost
  return runs > 0 ? Math.floor((100 * delivered) / runs) : 100
}
const hood = (name: string, tier: number): TsHoodDef => {
  const t = TS_HOOD_TIERS[tier]
  if (!t) throw new Error(`TS_HOODS: no tier ${tier}`)
  return {name, tier, ...t}
}
export const TS_HOODS: Record<number, TsHoodDef> = {
  1: hood('Boardwalk', 1),
  2: hood('Old Town', 1),
  3: hood('Scooter Row', 2),
  4: hood('University', 3),
  5: hood('Warehouse Dist.', 3),
  6: hood('Sunset Terrace', 3),
  7: hood('The Bluffs', 4),
  8: hood('Meridian Hts.', 4),
  9: hood('Market Dist.', 2),
  10: hood('Little Harbor', 2),
  11: hood('Palm Gardens', 1),
}
