/** Generic error detail for all responses. */
export type ErrorRsp = {error: string; status: number}
/** A shared daily-best record — null if nobody's set one yet today. */
export type DailyBest = {tip: number; ms: number; username: string} | null
/** One row of a leaderboard. On the daily board, tip/ms is that user's
 *  best single run that day. On the all-time board, tip is a running
 *  cumulative total across every run they've ever submitted and ms is
 *  always 0 (there's no meaningful "time" for a sum of runs).
 *  avatarUrl is cached at submission time (not fetched live per view) —
 *  null if the user has no snoovatar set, or the lookup failed. */
export type LeaderboardEntry = {
  username: string
  tip: number
  ms: number
  avatarUrl: string | null
}
/** Today's shared best plus the top-10 board, keyed by the server's own
 *  UTC date, not a client-supplied one (see game/index.html's tipsyBridge
 *  comment). viewerUsername is the requesting Reddit user, not the record
 *  holder — null if it couldn't be resolved (e.g. logged-out preview
 *  render). top is tip-ranked, descending; empty if nobody's played yet.
 *  plays is the count of deliveries STARTED on THIS dateStr across
 *  every player (see db.ts playsKey) -- starts, not completions. */
export type GetDailyBestRsp = {
  dateStr: string
  best: DailyBest
  viewerUsername: string | null
  top: LeaderboardEntry[]
  allTime: {best: DailyBest; top: LeaderboardEntry[]}
  plays: number
}
/** A completed run's tip/time, to be checked against the current best. */
export type SubmitDailyBestReq = {tip: number; ms: number}
export type SubmitDailyBestRsp = {
  dateStr: string
  best: DailyBest
  top: LeaderboardEntry[]
  allTime: {best: DailyBest; top: LeaderboardEntry[]}
}
/** The subset of Reddit's AccountDelete trigger payload this app needs.
 *  `user` is optional per Devvit's own docs — if it's missing, there's
 *  no username to key our Redis entries on, so the handler no-ops. */
export type AccountDeleteEvent = {
  userId: string
  user?: {username?: string}
}
/** One day this player has completed, from the permanent per-user
 *  history record (db.ts historyKey) — not the 30-day daily board, so
 *  this list can reach further back than that. tip/ms is this player's
 *  own best for that day, regardless of whether it came from the
 *  original play or a later replay. */
export type HistoryEntry = {dateStr: string; tip: number; ms: number}
/** Every day this player has completed, most recent first, plus their
 *  current all-time total (so the Past Routes screen doesn't need a
 *  second request just for that number). Empty history for a
 *  logged-out viewer, same convention as GetDailyBestRsp. */
export type GetHistoryRsp = {history: HistoryEntry[]; allTimeTotal: number}
/** A replay run for a day already in this player's history — see
 *  db.ts dbSubmitReplayScore for why dateStr is trusted here in a way
 *  it deliberately isn't for SubmitDailyBestReq. */
export type SubmitReplayReq = {dateStr: string; tip: number; ms: number}
export type SubmitReplayRsp = {
  dateStr: string
  improved: boolean
  delta: number
  tip: number
  ms: number
  allTime: {best: DailyBest; top: LeaderboardEntry[]}
}
/** Wallet + owned skins + equipped skin, server-authoritative (Phase B --
 *  see db.ts tpProfileKey/tpOwnedKey). 'classic' is always present in
 *  `owned` even though it's never persisted as a Redis field -- it's
 *  free and implicitly owned by everyone (see dbGetTpProfile). */
export type TpProfileRsp = {
  walletCents: number
  owned: string[]
  equipped: string
  /** Hood store (see tpcatalog.ts TS_HOODS). HOODS indices owned; 0 (The
   *  Flats) is always included. deliveries is the lifetime count of
   *  today's-route deliveries the unlock tiers read. The client mirrors
   *  both on every requestTpProfile, so server truth wins. */
  hoodsOwned: number[]
  deliveries: number
  /** Lifetime count of orders lost to a tip-over (see RecordLostReq).
   *  Success % is deliveries / (deliveries + lost), and every hood tier
   *  needs a minimum of it (tpcatalog.ts minSuccess). */
  lost: number
  /** Lifetime count of lost dogs brought home (game/index.html LOST_DOG;
   *  db.ts dbClaimDogRescue). The client keeps the larger of its own and
   *  this on every requestTpProfile. */
  dogsRescued: number
  /** The hoods' lost dogs taken home for good (their keys: game/index.html
   *  tpProfile.dogsHomed) and the strays taken to the shelter (their city
   *  keys: shelteredDogs). The client keeps the union of its own and these. */
  dogsHomed: string[]
  shelteredDogs: string[]
  /** Credits on High Tide's game card (db.ts dbArcade): the server's. */
  arcadeCredits: number
  /** missionId -> best count recorded server-side (see db.ts
   *  dbRecordMission). The client merges this into its local
   *  missionsCompleted/hjBest so progress follows a player across
   *  devices instead of living only in that browser's localStorage. */
  missions: Record<string, number>
}
/** skinId must be a 'purchase'-type skin in the server's own TS_SKINS
 *  catalog (tpcatalog.ts) -- price is never taken from the client. */
export type PurchaseSkinReq = {skinId: string}
export type PurchaseSkinRsp = TpProfileRsp
/** hoodIndex must be a TS_HOODS entry the player does not own, whose
 *  delivery requirement is met server-side; price comes from TS_HOODS. */
export type PurchaseHoodReq = {hoodIndex: number}
export type PurchaseHoodRsp = TpProfileRsp
/** Orders lost to one tip-over (the Tipsy Crew rescue in game/index.html
 *  -- owRescue). count is how many were aboard, clamped server-side to
 *  1..3 (TP_CARRY_MAX), since only the client knows; lost is the new
 *  lifetime total. */
export type RecordLostReq = {count: number}
export type RecordLostRsp = {lost: number}
/** skinId must already be owned (dbEquipSkin checks tpOwnedKey; 'classic'
 *  is always a valid target). */
export type EquipSkinReq = {skinId: string}
export type EquipSkinRsp = {equipped: string}
/** trophyId must be one of the trophies in TS_CLAIMABLE_TROPHIES
 *  (tpcatalog.ts) -- eligibility is re-derived server-side from this
 *  player's own dbGetHistory, never trusted from the client. See
 *  tpcatalog.ts for the evidence each claimable trophy rests on --
 *  hydrant-hop and slalom-master are now claimable, off the recorded
 *  mission count rather than off score history. */
export type ClaimTrophyRewardReq = {trophyId: string}
export type ClaimTrophyRewardRsp = {owned: string[]; skinId: string}
/** Fired once per delivery STARTED (GO / Retry / a shop's pickup in
 *  game/index.html) -- deliberately not once per completion, since the
 *  splash counter is meant to read "how many times has this been
 *  played". No body: the server keys the count on its own todayUTC(),
 *  so there is nothing for the client to supply or forge. */
export type CountPlayRsp = {plays: number}
/** Reports progress on a side mission. missionId must exist in the

 *  server's own TS_MISSIONS (tpcatalog.ts); best is a high-water count
 *  (cleared jumps for jump-hydrant, 1 for a pass/fail mission) and is
 *  clamped server-side to what a real clear could have earned. The
 *  server keeps the maximum, so reporting a worse run never erases a
 *  better one. */
export type CompleteMissionReq = {missionId: string; best: number}
/** best is the value AFTER the server's max/clamp, so the client can
 *  correct itself if its local number was ahead. firstCompletion marks
 *  the single call that crossed the finish line -- it drives the
 *  announce comment and is false on every later report. */
export type CompleteMissionRsp = {
  missionId: string
  best: number
  completed: boolean
  firstCompletion: boolean
}
/** Claims the slalom tip payout. cents is the CLIENT's computed payout
 *  (base + margin bonus + clean bonus) and is self-reported, like a
 *  mission count -- the server never ran the course. Two things bound
 *  the damage, same doctrine as CompleteMissionReq's clamp: the claim
 *  is capped to db.ts SLALOM_TIP_DAILY_MAX_CENTS, and only the
 *  improvement over the day's previous payout is ever credited, keyed
 *  on the SERVER's todayUTC() so a webview can't pad an arbitrary
 *  day's tally. */
export type ClaimSlalomTipReq = {cents: number}
/** credited is the delta actually paid this call (0 on a repeat run
 *  that didn't beat the day's payout high-water); walletCents is the
 *  post-call balance so the client can update its wallet without a
 *  second profile fetch. */
export type ClaimSlalomTipRsp = {credited: number; walletCents: number}
/** Pays a hospital tip envelope (a gift the game hides in Marina
 *  General's gift rooms) into the wallet. id is the gift's id, 'g' +
 *  floor + 'tips' (e.g. g4tips); the server pays a fixed
 *  db.ts GIFT_TIP_CENTS for each id in its own GIFT_TIP_IDS, once per
 *  user ever, and nothing for any other id. The heart run's delivery tip
 *  rides the same claim as id 'heart' (db.ts HEART_TIP_CENTS). */
export type ClaimGiftTipReq = {id: string}
/** credited is what this call paid (0 for a repeat or unknown id);
 *  walletCents is the post-call balance, as ClaimSlalomTipRsp. */
export type ClaimGiftTipRsp = {credited: number; walletCents: number}
/** A LOST DOG BROUGHT HOME (game/index.html LOST_DOG): the owner's tip
 *  into the wallet. The amount is the server's (db.ts DOG_RESCUE_CENTS),
 *  paid up to DOG_RESCUE_MAX_PER_DAY times a UTC day (the server's date);
 *  past that a rescue still counts (dogsRescued) but pays nothing. No
 *  request body. credited is what this call paid, walletCents the
 *  post-call balance, dogsRescued the lifetime count after this one. */
export type ClaimDogRescueRsp = {
  credited: number
  walletCents: number
  dogsRescued: number
}
/** The dog's key (optional): a hood's lost dog, home for good, kept in
 *  the player's dogsHomed so it is never lost again. */
export type ClaimDogRescueReq = {key?: string}
/** A LOST THING RETURNED TO ITS OWNER (game/index.html LOST_ITEMS): the
 *  item's id, 'l<YYYYMMDD>.<hood>.<kind>.<slot>'. The server pays its
 *  kind's db.ts LOST_RETURN_CENTS once per item (see dbClaimLostReturn);
 *  credited is what this call paid, walletCents the post-call balance. */
export type ClaimLostReturnReq = {id: string}
export type ClaimLostReturnRsp = {credited: number; walletCents: number}
/** A STRAY TAKEN TO THE SHELTER (game/index.html SHELTER): its city key,
 *  so it never walks that pavement again. No pay. */
export type RecordShelterReq = {key: string}
export type RecordShelterRsp = {dogsSheltered: number}
/** HIGH TIDE'S GAME CARD (db.ts dbArcade): grant (Marisol's credits, once
 *  ever, after 'arcade-card' is recorded), spend (one credit a game; when
 *  the card is empty a top-up of TS_ARCADE.topupCredits is bought from the
 *  wallet first, at the server's price). ok false: no credit and no money
 *  for a top-up. */
export type ArcadeReq = {op: 'grant' | 'spend'}
export type ArcadeRsp = {
  ok: boolean
  credits: number
  walletCents: number
  toppedUp: boolean
}
export type Endpoint = (typeof Endpoint)[keyof typeof Endpoint]
export const Endpoint = {
  GetDailyBest: 'api/tipsy/best',
  SubmitDailyBest: 'api/tipsy/best/submit',
  GetHistory: 'api/tipsy/history',
  SubmitReplay: 'api/tipsy/history/submit',
  GetTpProfile: 'api/tipsy/profile',
  PurchaseSkin: 'api/tipsy/profile/purchase',
  PurchaseHood: 'api/tipsy/profile/purchase-hood',
  RecordLost: 'api/tipsy/profile/lost',
  EquipSkin: 'api/tipsy/profile/equip',
  ClaimTrophyReward: 'api/tipsy/profile/claim',
  CompleteMission: 'api/tipsy/mission/complete',
  ClaimSlalomTip: 'api/tipsy/slalom/tip',
  ClaimGiftTip: 'api/tipsy/gift/tip',
  ClaimDogRescue: 'api/tipsy/dog/rescue',
  ClaimLostReturn: 'api/tipsy/lost/return',
  RecordShelter: 'api/tipsy/dog/shelter',
  Arcade: 'api/tipsy/arcade',
  CountPlay: 'api/tipsy/play',
  OnMenuNewPost: 'internal/on/menu/new-post',
  OnAccountDelete: 'internal/on/account/delete',
  OnSchedulerDeletedUserSweep: 'internal/scheduler/deleted-user-sweep',
} as const
export const EndpointMethod = {
  [Endpoint.GetDailyBest]: 'GET',
  [Endpoint.SubmitDailyBest]: 'POST',
  [Endpoint.GetHistory]: 'GET',
  [Endpoint.SubmitReplay]: 'POST',
  [Endpoint.GetTpProfile]: 'GET',
  [Endpoint.PurchaseSkin]: 'POST',
  [Endpoint.PurchaseHood]: 'POST',
  [Endpoint.RecordLost]: 'POST',
  [Endpoint.EquipSkin]: 'POST',
  [Endpoint.ClaimTrophyReward]: 'POST',
  [Endpoint.CompleteMission]: 'POST',
  [Endpoint.ClaimSlalomTip]: 'POST',
  [Endpoint.ClaimGiftTip]: 'POST',
  [Endpoint.ClaimDogRescue]: 'POST',
  [Endpoint.ClaimLostReturn]: 'POST',
  [Endpoint.RecordShelter]: 'POST',
  [Endpoint.Arcade]: 'POST',
  [Endpoint.CountPlay]: 'POST',
  [Endpoint.OnMenuNewPost]: 'POST',
  [Endpoint.OnAccountDelete]: 'POST',
  [Endpoint.OnSchedulerDeletedUserSweep]: 'POST',
} as const satisfies {[endpoint: string]: 'GET' | 'POST'}
