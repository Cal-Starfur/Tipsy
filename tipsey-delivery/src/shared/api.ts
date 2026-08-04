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
}
/** skinId must be a 'purchase'-type skin in the server's own TS_SKINS
 *  catalog (tpcatalog.ts) -- price is never taken from the client. */
export type PurchaseSkinReq = {skinId: string}
export type PurchaseSkinRsp = TpProfileRsp
/** skinId must already be owned (dbEquipSkin checks tpOwnedKey; 'classic'
 *  is always a valid target). */
export type EquipSkinReq = {skinId: string}
export type EquipSkinRsp = {equipped: string}
/** trophyId must be one of the trophies in TS_CLAIMABLE_TROPHIES
 *  (tpcatalog.ts) -- eligibility is re-derived server-side from this
 *  player's own dbGetHistory, never trusted from the client. See
 *  tpcatalog.ts for why hydrant-hop/slalom-master aren't claimable yet. */
export type ClaimTrophyRewardReq = {trophyId: string}
export type ClaimTrophyRewardRsp = {owned: string[]; skinId: string}
/** Fired once per delivery STARTED (GO / Retry / Again in
 *  game/index.html) -- deliberately not once per completion, since the
 *  splash counter is meant to read "how many times has this been
 *  played". No body: the server keys the count on its own todayUTC(),
 *  so there is nothing for the client to supply or forge. */
export type CountPlayRsp = {plays: number}
/** A failed run, reported so the app account can comment on the post.
 *  cause is an ID from a fixed set the SERVER owns the copy for (see
 *  server.ts FAIL_CAUSE_COPY) -- the client never supplies prose for
 *  it. address/hood ARE client strings (only the client knows the
 *  generated route) and are sanitized + truncated server-side before
 *  they reach a comment body. pct is 0-100 progress from pickup to
 *  door; tip is the order's dollar value that was on the line. */
export type SubmitFailReq = {
  cause: string
  address: string
  hood: string
  pct: number
  tip: number
  ms: number
  damage: number
}
/** posted:false is the normal, uninteresting outcome for a logged-out
 *  viewer or a run outside a post context -- not an error. */
export type SubmitFailRsp = {posted: boolean}
export type Endpoint = (typeof Endpoint)[keyof typeof Endpoint]
export const Endpoint = {
  GetDailyBest: 'api/tipsy/best',
  SubmitDailyBest: 'api/tipsy/best/submit',
  GetHistory: 'api/tipsy/history',
  SubmitReplay: 'api/tipsy/history/submit',
  GetTpProfile: 'api/tipsy/profile',
  PurchaseSkin: 'api/tipsy/profile/purchase',
  EquipSkin: 'api/tipsy/profile/equip',
  ClaimTrophyReward: 'api/tipsy/profile/claim',
  CountPlay: 'api/tipsy/play',
  SubmitFail: 'api/tipsy/fail',
  OnAppInstall: 'internal/on/app/install',
  OnMenuNewPost: 'internal/on/menu/new-post',
  OnAccountDelete: 'internal/on/account/delete',
  OnSchedulerDailyPost: 'internal/scheduler/daily-post-check',
  OnSchedulerDeletedUserSweep: 'internal/scheduler/deleted-user-sweep',
} as const
export const EndpointMethod = {
  [Endpoint.GetDailyBest]: 'GET',
  [Endpoint.SubmitDailyBest]: 'POST',
  [Endpoint.GetHistory]: 'GET',
  [Endpoint.SubmitReplay]: 'POST',
  [Endpoint.GetTpProfile]: 'GET',
  [Endpoint.PurchaseSkin]: 'POST',
  [Endpoint.EquipSkin]: 'POST',
  [Endpoint.ClaimTrophyReward]: 'POST',
  [Endpoint.CountPlay]: 'POST',
  [Endpoint.SubmitFail]: 'POST',
  [Endpoint.OnAppInstall]: 'POST',
  [Endpoint.OnMenuNewPost]: 'POST',
  [Endpoint.OnAccountDelete]: 'POST',
  [Endpoint.OnSchedulerDailyPost]: 'POST',
  [Endpoint.OnSchedulerDeletedUserSweep]: 'POST',
} as const satisfies {[endpoint: string]: 'GET' | 'POST'}



