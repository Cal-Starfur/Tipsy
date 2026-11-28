import {navigateTo, requestExpandedMode} from '@devvit/web/client'
import {
  Endpoint,
  type GetDailyBestRsp,
  type LeaderboardEntry,
} from '../shared/api.ts'

/** The most recent fetch, kept around so the Today/All-Time tab toggle
 *  can re-render instantly from what's already in memory rather than
 *  round-tripping to the server on every tap. */
let lastData: GetDailyBestRsp | null = null
let activeTab: 'daily' | 'allTime' = 'daily'

async function loadDailyBest(): Promise<void> {
  try {
    const rsp = await fetch(Endpoint.GetDailyBest)
    if (!rsp.ok) throw new Error(`GetDailyBest ${rsp.status}`)
    render((await rsp.json()) as GetDailyBestRsp)
  } catch (err) {
    console.error('splash: failed to load daily best', err)
  }
}

function render(data: GetDailyBestRsp): void {
  lastData = data
  const {best, viewerUsername} = data
  const handle = viewerUsername ?? 'there'

  /* The challenge is now a PERSON, not a number: naming today's leader
   *  is what makes it feel answerable. The amount hasn't gone anywhere —
   *  it's one line down in statEl, which already showed it. The
   *  nobody's-played-yet branch is deliberately untouched. */
  if (best) {
    greetEl.textContent = `Hey, ${handle} — can you beat u/${best.username}?`
    statEl.textContent = `today's best: ${formatTip(best.tip)} · ${formatTime(best.ms)}`
  } else {
    greetEl.textContent = `Hey, ${handle} — nobody's delivered today yet.`
    statEl.textContent = 'be the first on the board'
  }

  playsEl.textContent = data.plays
    ? `${data.plays.toLocaleString()} ${data.plays === 1 ? 'delivery' : 'deliveries'} attempted today`
    : ''

  renderActiveTab()
}

/** Redraws the list + party from whichever board is currently selected,
 *  without touching greet/stat — those stay tied to the daily challenge
 *  regardless of which board is being browsed. */
function renderActiveTab(): void {
  if (!lastData) return
  const top = activeTab === 'daily' ? lastData.top : lastData.allTime.top
  renderLeaderboard(top)
}

function formatTip(tip: number): string {
  return `$${tip.toFixed(2)}`
}

function formatTime(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

/* ============================================================
 * Leaderboard — ranked list rows plus a "party" of avatars spread
 * across the full card as background texture (see renderParty below).
 * Avatar URLs come pre-cached from the server (fetched once, at
 * submission time, not live per view) — a missing avatarUrl just
 * means that Redditor has no snoovatar set, not a load failure.
 * ============================================================ */

const CHIP_COLORS = [
  '#ff9c4d',
  '#ffb454',
  '#7fe3ff',
  '#ff5722',
  '#c2452e',
  '#a679ff',
  '#5dcaa5',
  '#f0997b',
  '#85b7eb',
  '#d4537e',
]

function colorFor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++)
    hash = (hash * 31 + username.charCodeAt(i)) | 0
  return CHIP_COLORS[Math.abs(hash) % CHIP_COLORS.length] ?? '#ffb454'
}

/** Small circular chip for the list rows — clipped, consistent size,
 *  falls back to a colored initial if there's no avatar. */
function makeListChip(entry: LeaderboardEntry): HTMLElement {
  const chip = document.createElement('div')
  chip.className = 'chip'
  if (entry.avatarUrl) {
    const img = document.createElement('img')
    img.src = entry.avatarUrl
    img.alt = ''
    img.onerror = () => {
      img.remove()
      chip.style.background = colorFor(entry.username)
      chip.textContent = entry.username.charAt(0).toUpperCase()
    }
    chip.appendChild(img)
  } else {
    chip.style.background = colorFor(entry.username)
    chip.style.color = 'rgba(0,0,0,0.55)'
    chip.style.fontWeight = '700'
    chip.style.fontSize = '11px'
    chip.textContent = entry.username.charAt(0).toUpperCase()
  }
  return chip
}

/** Full-size, natural-aspect avatar for the party layer — snoovatars
 *  are full character art, not headshots, so these are never clipped
 *  to a circle. Falls back to a plain colored circle so a missing
 *  avatar doesn't leave a hole in the cluster. */
function makePartyAvatar(entry: LeaderboardEntry, size: number): HTMLElement {
  if (entry.avatarUrl) {
    const img = document.createElement('img')
    img.src = entry.avatarUrl
    img.alt = ''
    img.className = 'avatar'
    img.style.width = `${size}px`
    img.style.height = `${size}px`
    img.style.objectFit = 'contain'
    img.onerror = () => {
      const fallback = fallbackBlob(entry, size)
      fallback.className = 'avatar'
      fallback.style.left = img.style.left
      fallback.style.top = img.style.top
      img.replaceWith(fallback)
    }
    return img
  }
  const blob = fallbackBlob(entry, size)
  blob.className = 'avatar'
  return blob
}

function fallbackBlob(entry: LeaderboardEntry, size: number): HTMLElement {
  const el = document.createElement('div')
  el.style.width = `${size}px`
  el.style.height = `${size}px`
  el.style.borderRadius = '50%'
  el.style.background = colorFor(entry.username)
  el.style.border = '2px solid rgba(255,255,255,0.25)'
  return el
}

function renderLeaderboard(top: LeaderboardEntry[]): void {
  listEl.innerHTML = ''
  for (const [i, entry] of top.entries()) {
    const row = document.createElement('div')
    row.className = 'row'

    const rankEl = document.createElement('span')
    rankEl.className = 'rank'
    rankEl.textContent = String(i + 1)

    const nameEl = document.createElement('span')
    nameEl.className = 'name'
    nameEl.textContent = entry.username

    const scoreEl = document.createElement('span')
    scoreEl.className = 'score'
    // Daily rows are a single best run (tip + time both mean something).
    // All-time rows are a cumulative total across every run — there's no
    // single "time" to show alongside a sum, so just the total.
    scoreEl.textContent =
      activeTab === 'daily'
        ? `${formatTip(entry.tip)} · ${formatTime(entry.ms)}`
        : formatTip(entry.tip)

    row.append(rankEl, makeListChip(entry), nameEl, scoreEl)
    listEl.appendChild(row)
  }

  // The party is sized against the card's real, already-laid-out
  // height (list included) so it reaches all the way down rather
  // than stopping at the hero section.
  renderParty(top)
}

const PARTY_SIZES = [104, 88, 88, 74, 74, 74, 60, 60, 60, 60]

function renderParty(top: LeaderboardEntry[]): void {
  partyEl.innerHTML = ''
  if (top.length === 0) return

  const w = cardEl.offsetWidth
  const h = cardEl.offsetHeight
  const golden = (137.508 * Math.PI) / 180
  const placed: {x: number; y: number; r: number; entry: LeaderboardEntry}[] =
    []

  top.forEach((entry, i) => {
    const size = PARTY_SIZES[i] ?? 60
    const radius = size / 2
    const angle = i * golden
    let dist = 0
    let x = w / 2
    let y = h / 2
    for (let step = 0; step < 400; step++) {
      x = w / 2 + Math.cos(angle) * dist
      y = h / 2 + Math.sin(angle) * dist * 3.2
      const clear = placed.every(
        p => Math.hypot(x - p.x, y - p.y) >= (radius + p.r) * 1.1,
      )
      if (clear) break
      dist += 2.5
    }
    placed.push({x, y, r: radius, entry})
  })

  // paint back-to-front: lowest rank first, rank 1 last (on top)
  for (const p of [...placed].reverse()) {
    const chip = makePartyAvatar(p.entry, p.r * 2)
    chip.style.position = 'absolute'
    chip.style.left = `${p.x}px`
    chip.style.top = `${p.y}px`
    chip.style.transform = 'translate(-50%, -50%)'
    partyEl.appendChild(chip)
  }
}

/* ============================================================
 * City backdrop — THE GAME'S OWN MAP (2026-11-28): a stretch of the
 * game's map screen as it draws it now (drawRouteMap: the slabbed
 * blocks and their buildings, parks and their paths, street and
 * neighbourhood names, the shop pins -- Ferris Taylor, Marina General,
 * Memorial Park), kept beside this page as splash-map.jpg and laid over
 * the card and the page behind it, cover-fitted. It replaces the flat
 * block-map that was hand-drawn here and had fallen behind the game's
 * map. The attract mode's live city still fades in over it once the
 * engine paints.
 * ============================================================ */

let cityImg: HTMLImageElement | null = null
let cityImgLoaded = false
const cityImgWaiting: Array<(img: HTMLImageElement) => void> = []

function withCityImage(cb: (img: HTMLImageElement) => void): void {
  if (cityImg && cityImgLoaded) {
    cb(cityImg)
    return
  }
  cityImgWaiting.push(cb)
  if (cityImg) return
  const img = new Image()
  cityImg = img
  img.onload = () => {
    cityImgLoaded = true
    for (const fn of cityImgWaiting.splice(0)) fn(img)
  }
  img.onerror = () => console.error('splash: splash-map.jpg failed to load')
  img.src = 'splash-map.jpg'
}

function renderCityBackdrop(
  canvas: HTMLCanvasElement,
  wIn: number,
  hIn: number,
): void {
  // Devvit's webview doesn't always have #card laid out yet at the instant
  // this first runs — a 0×0 backing store just renders nothing, even
  // though the CSS box still stretches to fill the card. Fall back to a
  // sane default so there's always something on screen; the callers
  // re-render at the real size once layout/ResizeObserver confirms it.
  const w = wIn > 0 ? wIn : 380
  const h = hIn > 0 ? hIn : 660
  const dpr = window.devicePixelRatio || 1
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#474a54' // the map's own roads, until it lands
  ctx.fillRect(0, 0, w, h)
  withCityImage(img => {
    const k = Math.max(w / img.naturalWidth, h / img.naturalHeight)
    const dw = img.naturalWidth * k
    const dh = img.naturalHeight * k
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
  })
}

/* ============================================================
 * THE SPLASH'S TIPSEY IS THE GAME'S OWN (2026-11-28): a picture of him
 * drawn by the game itself (drawTipseyParked, the Classic skin, at the
 * app icon's three-quarter turn), kept beside this page as
 * tipsey-splash.png -- in place of the hand-copied robot drawer that
 * used to live here and had fallen behind the game's art (the old open
 * lid). Drawn into #robot-canvas at 88 css px wide, devicePixelRatio
 * sharp. Until it loads the canvas stays empty; the attract mode's live
 * city takes over either way.
 * ============================================================ */
function renderRobotIcon(canvas: HTMLCanvasElement): void {
  const cssWidth = 88
  const img = new Image()
  img.onload = () => {
    const dpr = window.devicePixelRatio || 1
    const cssHeight = (cssWidth * img.naturalHeight) / img.naturalWidth
    canvas.width = Math.round(cssWidth * dpr)
    canvas.height = Math.round(cssHeight * dpr)
    canvas.style.width = `${cssWidth}px`
    canvas.style.height = `${cssHeight}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  }
  img.onerror = () => console.error('splash: tipsey-splash.png failed to load')
  img.src = 'tipsey-splash.png'
}

/* ============================================================
 * Kickoff — deliberately last in the file, after every declaration
 * it uses has run.
 * ============================================================ */

const startBtn = document.getElementById('start-btn') as HTMLButtonElement
const greetEl = document.getElementById('greet') as HTMLParagraphElement
const statEl = document.getElementById('stat') as HTMLParagraphElement
const playsEl = document.getElementById('plays') as HTMLParagraphElement
const robotCanvas = document.getElementById('robot-canvas') as HTMLCanvasElement
const cityCanvas = document.getElementById('city-bg') as HTMLCanvasElement
const pageBgCanvas = document.getElementById('page-bg') as HTMLCanvasElement
const cardEl = document.getElementById('card') as HTMLElement
const listEl = document.getElementById('list') as HTMLElement
const partyEl = document.getElementById('party') as HTMLElement
const tabDailyBtn = document.getElementById('tab-daily') as HTMLButtonElement
const tabAllTimeBtn = document.getElementById(
  'tab-alltime',
) as HTMLButtonElement
const howToBtn = document.getElementById('how-to-btn') as HTMLButtonElement
const notifyBtn = document.getElementById('notify-btn') as HTMLButtonElement
const howToModal = document.getElementById('how-to-modal') as HTMLElement
const howToCloseBtn = document.getElementById(
  'how-to-close',
) as HTMLButtonElement

// Start never waits on the network — the challenge copy is a bonus, not
// a gate. If the fetch is slow or fails, the default markup copy stands
// and the button still works.
startBtn.addEventListener('click', ev => requestExpandedMode(ev, 'game'))

function selectTab(tab: 'daily' | 'allTime'): void {
  activeTab = tab
  tabDailyBtn.classList.toggle('active', tab === 'daily')
  tabAllTimeBtn.classList.toggle('active', tab === 'allTime')
  renderActiveTab()
}
tabDailyBtn.addEventListener('click', () => selectTab('daily'))
tabAllTimeBtn.addEventListener('click', () => selectTab('allTime'))

howToBtn.addEventListener('click', () => howToModal.classList.add('open'))
/* no permission to subscribe a player directly (Reddit's own
   subscribeToCurrentSubreddit() only ever subscribes the app account
   itself — subscribing a player requires Reddit's explicit sign-off,
   same shape as the push-notification beta). This just takes them to
   the subreddit so they can tap Reddit's own native Join/bell button
   there — one extra tap, but fully functional today. */
notifyBtn.addEventListener('click', () =>
  navigateTo('https://www.reddit.com/r/Tipsey/'),
)
howToCloseBtn.addEventListener('click', () =>
  howToModal.classList.remove('open'),
)
// Tapping the dimmed backdrop closes it too, not just the explicit close
// button — but only when the tap lands on the backdrop itself, not
// anything inside the card.
howToModal.addEventListener('click', ev => {
  if (ev.target === howToModal) howToModal.classList.remove('open')
})

function sizeAndRenderCityBackdrop(): void {
  try {
    renderCityBackdrop(cityCanvas, cardEl.clientWidth, cardEl.clientHeight)
  } catch (err) {
    console.error('splash: city backdrop render failed', err)
  }
}
sizeAndRenderCityBackdrop()
// #card's real size isn't always settled on the very first tick in
// Devvit's webview (see renderCityBackdrop's fallback comment) — a
// ResizeObserver catches the real layout whenever it lands, and also
// keeps the map correctly framed across orientation/size changes, which
// a one-shot render never would.
if (typeof ResizeObserver !== 'undefined') {
  const cityResizeObserver = new ResizeObserver(() =>
    sizeAndRenderCityBackdrop(),
  )
  cityResizeObserver.observe(cardEl)
}

// Same map, extended to the full page behind #card — Reddit gives this
// post a taller frame than the compact card fills, and a flat color
// back there reads as dead space next to the card's own detailed map.
// Viewport-sized rather than element-sized, so it tracks window resize
// rather than #card's own layout.
function sizeAndRenderPageBackdrop(): void {
  try {
    renderCityBackdrop(pageBgCanvas, window.innerWidth, window.innerHeight)
  } catch (err) {
    console.error('splash: page backdrop render failed', err)
  }
}
sizeAndRenderPageBackdrop()
window.addEventListener('resize', sizeAndRenderPageBackdrop)

try {
  renderRobotIcon(robotCanvas)
} catch (err) {
  console.error('splash: robot render failed', err)
}
void loadDailyBest()
