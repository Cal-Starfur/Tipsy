/** Generic error detail for all responses. */
export type ErrorRsp = {error: string; status: number}
/** A shared daily-best record — null if nobody's set one yet today. */
export type DailyBest = {tip: number; ms: number; username: string} | null
/** One row of the daily leaderboard — best single run for that user today.
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
export type Endpoint = (typeof Endpoint)[keyof typeof Endpoint]
export const Endpoint = {
  GetDailyBest: 'api/tipsy/best',
  SubmitDailyBest: 'api/tipsy/best/submit',
  OnAppInstall: 'internal/on/app/install',
  OnMenuNewPost: 'internal/on/menu/new-post',
  OnMenuBackfillAllTime: 'internal/on/menu/backfill-alltime',
  OnAccountDelete: 'internal/on/account/delete',
  OnSchedulerDailyPost: 'internal/scheduler/daily-post-check',
  OnSchedulerDeletedUserSweep: 'internal/scheduler/deleted-user-sweep',
} as const
export const EndpointMethod = {
  [Endpoint.GetDailyBest]: 'GET',
  [Endpoint.SubmitDailyBest]: 'POST',
  [Endpoint.OnAppInstall]: 'POST',
  [Endpoint.OnMenuNewPost]: 'POST',
  [Endpoint.OnMenuBackfillAllTime]: 'POST',
  [Endpoint.OnAccountDelete]: 'POST',
  [Endpoint.OnSchedulerDailyPost]: 'POST',
  [Endpoint.OnSchedulerDeletedUserSweep]: 'POST',
} as const satisfies {[endpoint: string]: 'GET' | 'POST'}



