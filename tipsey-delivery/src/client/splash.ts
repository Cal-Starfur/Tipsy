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
 * City backdrop — a static Costa Palma neighborhood grid drawn behind
 * the party/scrim layers, replacing the old purple radial-gradient.
 * Same block/road palette as game/index.html's drawRouteMap (housing/
 * park/commercial blocks, road bands, park tree dots, street labels),
 * reimplemented in plain Canvas 2D rather than importing the game's
 * world-gen — same "stay lightweight, no Phaser" reasoning as the
 * robot renderer below. Fixed seed: this reads as one specific place
 * (Costa Palma), not a different skyline on every load.
 * ============================================================ */

type CityBlockType = 'housing' | 'park' | 'commercial'

const CITY_BLOCK_COLORS: Record<CityBlockType, string> = {
  housing: '#e3d4b8',
  park: '#8fbf7a',
  commercial: '#c4c8cc',
}
const CITY_ROAD = '#4a4d55'
const CITY_ROADLINE = '#8f897b'
const CITY_TREE = '#3f7a4a'
// Palm Gardens' real street pool (see game/index.html's HOODS list) —
// numbered cross streets follow the same named-one-way/numbered-other
// convention the real map uses.
const CITY_STREETS = ['Frond Ave', 'Coconut Ct', 'Shade St']
const CITY_NUM_STREETS = [5, 6, 7]
const CITY_TREE_SPOTS: [number, number][] = [
  [0.32, 0.32],
  [0.68, 0.62],
  [0.3, 0.72],
]
const CITY_ROUTE_PTS: [number, number][] = [
  [0.5, 0.06],
  [0.5, 0.3],
  [0.22, 0.3],
  [0.22, 0.5],
  [0.72, 0.5],
  [0.72, 0.72],
  [0.4, 0.72],
  [0.4, 0.94],
]
const CITY_SEED = 20260721
const CITY_COLS = 5
const CITY_ROWS = 8

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function renderCityBackdrop(
  canvas: HTMLCanvasElement,
  wIn: number,
  hIn: number,
): void {
  // Devvit's webview doesn't always have #card laid out yet at the instant
  // this first runs (unlike the robot canvas, which computes its own fixed
  // offscreen size and never depends on DOM measurement) — a 0×0 backing
  // store just renders nothing, even though the CSS box still stretches to
  // fill the card. Fall back to a sane default so there's always something
  // on screen; sizeAndRenderCityBackdrop below re-renders at the real size
  // once layout/ResizeObserver confirms it.
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

  ctx.fillStyle = CITY_ROAD
  ctx.fillRect(0, 0, w, h)

  const cw = w / CITY_COLS
  const rh = h / CITY_ROWS
  const streetW = Math.min(cw, rh) * 0.26

  const rand = mulberry32(CITY_SEED)
  const types: CityBlockType[][] = []
  for (let r = 0; r < CITY_ROWS; r++) {
    const row: CityBlockType[] = []
    for (let c = 0; c < CITY_COLS; c++) {
      const v = rand()
      row.push(v < 0.15 ? 'park' : v < 0.55 ? 'commercial' : 'housing')
    }
    types.push(row)
  }

  for (let r = 0; r < CITY_ROWS; r++) {
    for (let c = 0; c < CITY_COLS; c++) {
      const x = c * cw + streetW / 2
      const y = r * rh + streetW / 2
      const bw = cw - streetW
      const bh = rh - streetW
      const type = at(at(types, r), c)
      ctx.fillStyle = CITY_BLOCK_COLORS[type]
      ctx.fillRect(x, y, bw, bh)
      if (type === 'park') {
        ctx.fillStyle = CITY_TREE
        for (const spot of CITY_TREE_SPOTS) {
          const tx = at(spot, 0)
          const ty = at(spot, 1)
          ctx.beginPath()
          ctx.arc(
            x + bw * tx,
            y + bh * ty,
            Math.min(bw, bh) * 0.11,
            0,
            Math.PI * 2,
          )
          ctx.fill()
        }
      }
    }
  }

  ctx.strokeStyle = CITY_ROADLINE
  ctx.lineWidth = 1.4
  ctx.setLineDash([6, 7])
  for (let c = 1; c < CITY_COLS; c++) {
    const x = c * cw
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  for (let r = 1; r < CITY_ROWS; r++) {
    const y = r * rh
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  ctx.setLineDash([])

  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  for (let r = 1; r < CITY_ROWS; r++) {
    const name = at(CITY_STREETS, (r - 1) % CITY_STREETS.length)
    ctx.save()
    ctx.translate(w - 26, r * rh)
    ctx.fillText(name, 0, -7)
    ctx.restore()
  }
  for (let c = 1; c < CITY_COLS; c++) {
    const label = `${at(CITY_NUM_STREETS, (c - 1) % CITY_NUM_STREETS.length)}th St`
    ctx.save()
    ctx.translate(c * cw, 20)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(label, 0, -7)
    ctx.restore()
  }

  // brand accent: soft orange route line threading the grid, echoing
  // the real in-game route path on the mapCard screen
  ctx.strokeStyle = 'rgba(255,122,26,0.55)'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  CITY_ROUTE_PTS.forEach((pt, i) => {
    const x = at(pt, 0) * w
    const y = at(pt, 1) * h
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()
}

/** Bounds-checked array access, used in place of the `!` non-null
 *  assertion operator (forbidden by lint). The index is always in range
 *  here — each call site's own loop condition already guarantees it —
 *  so the thrown error is a should-never-happen guard, not expected
 *  control flow. */
function at<T>(arr: readonly T[], i: number): T {
  const v = arr[i]
  if (v === undefined) throw new Error(`index ${i} out of bounds`)
  return v
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
