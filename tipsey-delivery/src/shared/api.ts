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
 *  render). top is tip-ranked, descending; empty if nobody's played yet. */
export type GetDailyBestRsp = {
  dateStr: string
  best: DailyBest
  viewerUsername: string | null
  top: LeaderboardEntry[]
  allTime: {best: DailyBest; top: LeaderboardEntry[]}
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
export type Endpoint = (typeof Endpoint)[keyof typeof Endpoint]
export const Endpoint = {
  GetDailyBest: 'api/tipsy/best',
  SubmitDailyBest: 'api/tipsy/best/submit',
  GetHistory: 'api/tipsy/history',
  SubmitReplay: 'api/tipsy/history/submit',
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
  [Endpoint.OnAppInstall]: 'POST',
  [Endpoint.OnMenuNewPost]: 'POST',
  [Endpoint.OnAccountDelete]: 'POST',
  [Endpoint.OnSchedulerDailyPost]: 'POST',
  [Endpoint.OnSchedulerDeletedUserSweep]: 'POST',
} as const satisfies {[endpoint: string]: 'GET' | 'POST'}



