/** Generic error detail for all responses. */
export type ErrorRsp = {error: string; status: number}
/** The current counter state for this post. */
export type GetCounterRsp = {count: number}
/** Increment the post counter by a signed amount. */
export type IncCounterReq = {amount: number}
export type IncCounterRsp = {count: number}
/** A shared daily-best record — null if nobody's set one yet today. */
export type DailyBest = {tip: number; ms: number; username: string} | null
/** Today's shared best, keyed by the server's own UTC date, not a
 *  client-supplied one (see game/index.html's tipsyBridge comment). */
export type GetDailyBestRsp = {dateStr: string; best: DailyBest}
/** A completed run's tip/time, to be checked against the current best. */
export type SubmitDailyBestReq = {tip: number; ms: number}
export type SubmitDailyBestRsp = {dateStr: string; best: DailyBest}
export type Endpoint = (typeof Endpoint)[keyof typeof Endpoint]
export const Endpoint = {
  GetCounter: 'api/counter',
  IncCounter: 'api/counter/inc',
  GetDailyBest: 'api/tipsy/best',
  SubmitDailyBest: 'api/tipsy/best/submit',
  OnAppInstall: 'internal/on/app/install',
  OnMenuNewPost: 'internal/on/menu/new-post',
} as const
export const EndpointMethod = {
  [Endpoint.GetCounter]: 'GET',
  [Endpoint.IncCounter]: 'POST',
  [Endpoint.GetDailyBest]: 'GET',
  [Endpoint.SubmitDailyBest]: 'POST',
  [Endpoint.OnAppInstall]: 'POST',
  [Endpoint.OnMenuNewPost]: 'POST',
} as const satisfies {[endpoint: string]: 'GET' | 'POST'}
