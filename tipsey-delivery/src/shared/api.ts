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
  /** missionId -> best count recorded server-side (see db.ts
   *  dbRecordMission). The client merges this into its local
   *  missionsCompleted/hjBest so progress follows a player across
   *  devices instead of living only in that browser's localStorage. */
  missions: Record<string, number>
  /** Whether this account already claimed the one-time follow bonus --
   *  lets the client skip the 3rd-fail follow prompt entirely. */
  followBonusClaimed: boolean
  /** Server-side truth behind the client's retry gate (Sir's call,
   *  2026-08 -- see db.ts dbGetFailPending/failPendingKey for the full
   *  rationale). The client's own tdFx.deliveryUnposted/hydrantUnposted
   *  and tsfFx.unposted are restored from these three booleans on every
   *  requestTpProfile() -- i.e. on every fresh boot -- since plain
   *  in-memory state doesn't survive an app restart on its own. */
  failPending: {delivery: boolean; slalom: boolean; hydrant: boolean}
  /** The server-composed draft behind each LIVE gate above, so a client
   *  that has just booted (or cleared its storage, or moved device) can
   *  paint the real composer instead of falling back to a plain ungated
   *  Retry. Empty string wherever the matching failPending flag is
   *  false -- see db.ts dbGetFailPending. */
  failDrafts: {delivery: string; slalom: string; hydrant: string}
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
 *  tpcatalog.ts for the evidence each claimable trophy rests on --
 *  hydrant-hop and slalom-master are now claimable, off the recorded
 *  mission count rather than off score history. */
export type ClaimTrophyRewardReq = {trophyId: string}
export type ClaimTrophyRewardRsp = {owned: string[]; skinId: string}
/** Fired once per delivery STARTED (GO / Retry / Again in
 *  game/index.html) -- deliberately not once per completion, since the
 *  splash counter is meant to read "how many times has this been
 *  played". No body: the server keys the count on its own todayUTC(),
 *  so there is nothing for the client to supply or forge. */
export type CountPlayRsp = {plays: number}
/** A failed run, reported so the server can compose a DRAFT comment
 *  the player may then edit and post themselves (see PostFailComment).
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
/** text is the composed draft; NOTHING is posted by this endpoint any
 *  more (Devvit user-actions rules: no automated actions). An empty
 *  text is the normal, uninteresting outcome for a logged-out viewer
 *  or a run outside a post context -- not an error. */
export type SubmitFailRsp = {text: string}
/** The player's (possibly edited) fail comment, posted as the USER in
 *  reply to the pinned anchor -- only ever sent by an explicit
 *  COMMENT -> POST press in the fail overlay. text is clamped and
 *  control-char-stripped server-side; posted:false is the normal
 *  outcome for a logged-out viewer or a run outside a post context. */
export type PostFailCommentReq = {text: string}
export type PostFailCommentRsp = {posted: boolean}
/** Subscribes the pressing user to the current subreddit (enabled by
 *  SUBSCRIBE_TO_SUBREDDIT in devvit.json's asUser) and grants the
 *  one-time follow bonus. joined:true + granted:false means the bonus
 *  was already claimed (db.ts dbClaimFollowBonus's hSetNX is the real
 *  gate). walletCents is the post-call balance so the client can
 *  update its wallet without a second profile fetch. */
export type FollowRsp = {joined: boolean; granted: boolean; walletCents: number}
/** A completed (winning) run, reported so the server can compose a DRAFT
 *  comment the player may edit and post themselves (see PostWinComment) --
 *  same contract as SubmitFailReq. address/hood are client strings,
 *  sanitized + truncated server-side before they reach a comment body.
 *  pct is the tip percentage earned (0-22, see game/index.html's tip
 *  engine); tip is the dollar payout, not the order's face value. */
export type SubmitWinReq = {
  address: string
  hood: string
  pct: number
  tip: number
  ms: number
}
/** text is the composed draft; nothing is posted by this endpoint (same
 *  no-automated-actions rule as SubmitFailRsp). Empty text is the normal
 *  outcome for a logged-out viewer or a run outside a post context, or a
 *  replay of a past date (see game/index.html reportWin -- a comment
 *  about a stale replay route reads as noise on today's post). */
export type SubmitWinRsp = {text: string}
/** The player's (possibly edited) win comment, posted as the USER in
 *  reply to the pinned anchor -- only ever sent by an explicit
 *  COMMENT -> POST press on the win screen. The $5/day bonus is paid
 *  atomically in the same call, gated BEHIND a confirmed post landing
 *  (server.ts routePostWinComment) -- no comment, no pay, same doctrine
 *  as Follow. bonusGranted:false with posted:true means the comment went
 *  up fine but today's bonus was already claimed (db.ts
 *  dbClaimWinCommentBonus's hSetNX is the real gate, keyed per calendar
 *  day so it resets tomorrow). walletCents is the post-call balance. */
export type PostWinCommentReq = {text: string}
export type PostWinCommentRsp = {
  posted: boolean
  bonusGranted: boolean
  walletCents: number
}
/** A winning Cone Slalom run, reported so the server can compose a
 *  DRAFT comment (see PostSlalomWinComment) -- same draft/post split as
 *  SubmitWinReq, just with slalom's own numbers instead of an
 *  address/hood (the course isn't tied to a street). totalSecs is raw
 *  run time plus penalties (what the result card calls "total");
 *  parSecs is that course's par; clean is true only when every cone
 *  was cleared with zero penalty seconds. */
export type SubmitSlalomWinReq = {
  totalSecs: number
  parSecs: number
  clean: boolean
}
export type SubmitSlalomWinRsp = {text: string}
/** The player's (possibly edited) slalom win comment, posted as the
 *  USER in reply to the pinned anchor -- only ever sent by an explicit
 *  COMMENT -> POST press on the slalom result card. The $5/day bonus
 *  claims from a SEPARATE pool than PostWinCommentRsp's (db.ts
 *  dbClaimCommentBonus's source:'slalom' vs source:'win') -- clearing
 *  both a delivery and a slalom course in the same day pays both. */
export type PostSlalomWinCommentReq = {text: string}
export type PostSlalomWinCommentRsp = {
  posted: boolean
  bonusGranted: boolean
  walletCents: number
}
/** A FAILED Cone Slalom run (tipped over, William, double-miss -- any
 *  cause a FAIL card prints), reported so the server can compose a
 *  draft describing the wipeout. Same draft/post split as every other
 *  Submit* type here. faultCount is run.faults.length; cause is
 *  run.fail's own string ("tipped over", "William got you", ...) --
 *  passed through as-is rather than re-deriving it server-side, since
 *  the client is the only place that knows which of the several fail
 *  conditions actually fired. */
export type SubmitSlalomFailReq = {
  totalSecs: number
  faultCount: number
  cause: string
}
export type SubmitSlalomFailRsp = {text: string}
/** The player's (possibly edited) slalom FAIL comment, posted as the
 *  USER in reply to the pinned anchor. No bonus (Sir's call, 2026-08):
 *  a slalom fail is now a GATED retry (game/index.html tsfFx) -- the
 *  post is the price of Retry, not an optional paid extra, same policy
 *  as PostFailCommentRsp and the new PostHydrantFailCommentRsp below.
 *  The old $5/day source:'slalom-fail' pool (dbClaimCommentBonus) is
 *  retired; db.ts still recognizes the source for any stale rows, it's
 *  just never claimed from here anymore. */
export type PostSlalomFailCommentReq = {text: string}
export type PostSlalomFailCommentRsp = {posted: boolean}
/** A FAILED Hydrant Challenge jump (missed the gap, burst a hydrant,
 *  never left the ground, knocked over -- any cause the crash screen
 *  prints), reported so the server can compose a draft describing the
 *  wipeout. Same draft/post split as SubmitSlalomFailReq. level is the
 *  jump the player was ON when they crashed (WorldScene.hjLevel); best
 *  is this run's high-water level (WorldScene.hjBest) for context in
 *  the comment; cause is the crash screen's own result string
 *  ("BURST A HYDRANT", "MISSED IT", ...) -- passed through as-is, same
 *  reasoning as SubmitSlalomFailReq.cause: the client is the only place
 *  that knows which crash condition actually fired. */
export type SubmitHydrantFailReq = {
  level: number
  best: number
  cause: string
}
export type SubmitHydrantFailRsp = {text: string}
/** The player's (possibly edited) hydrant FAIL comment, posted as the
 *  USER in reply to the pinned anchor -- only ever sent by an explicit
 *  Retry press on a gate-eligible crash (game/index.html hjFx). No
 *  bonus, same policy as PostFailCommentRsp/PostSlalomFailCommentRsp:
 *  posting is the price of Retry here, not a paid extra. */
export type PostHydrantFailCommentReq = {text: string}
export type PostHydrantFailCommentRsp = {posted: boolean}
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
 *  second profile fetch -- same contract as FollowRsp. */
export type ClaimSlalomTipRsp = {credited: number; walletCents: number}
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
  CompleteMission: 'api/tipsy/mission/complete',
  ClaimSlalomTip: 'api/tipsy/slalom/tip',
  CountPlay: 'api/tipsy/play',
  SubmitFail: 'api/tipsy/fail',
  PostFailComment: 'api/tipsy/fail/comment',
  Follow: 'api/tipsy/follow',
  SubmitWin: 'api/tipsy/win',
  PostWinComment: 'api/tipsy/win/comment',
  SubmitSlalomWin: 'api/tipsy/slalom/win',
  PostSlalomWinComment: 'api/tipsy/slalom/win/comment',
  SubmitSlalomFail: 'api/tipsy/slalom/fail',
  PostSlalomFailComment: 'api/tipsy/slalom/fail/comment',
  SubmitHydrantFail: 'api/tipsy/hydrant/fail',
  PostHydrantFailComment: 'api/tipsy/hydrant/fail/comment',
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
  [Endpoint.CompleteMission]: 'POST',
  [Endpoint.ClaimSlalomTip]: 'POST',
  [Endpoint.CountPlay]: 'POST',
  [Endpoint.SubmitFail]: 'POST',
  [Endpoint.PostFailComment]: 'POST',
  [Endpoint.Follow]: 'POST',
  [Endpoint.SubmitWin]: 'POST',
  [Endpoint.PostWinComment]: 'POST',
  [Endpoint.SubmitSlalomWin]: 'POST',
  [Endpoint.PostSlalomWinComment]: 'POST',
  [Endpoint.SubmitSlalomFail]: 'POST',
  [Endpoint.PostSlalomFailComment]: 'POST',
  [Endpoint.SubmitHydrantFail]: 'POST',
  [Endpoint.PostHydrantFailComment]: 'POST',
  [Endpoint.OnAppInstall]: 'POST',
  [Endpoint.OnMenuNewPost]: 'POST',
  [Endpoint.OnAccountDelete]: 'POST',
  [Endpoint.OnSchedulerDailyPost]: 'POST',
  [Endpoint.OnSchedulerDeletedUserSweep]: 'POST',
} as const satisfies {[endpoint: string]: 'GET' | 'POST'}
