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

  if (best) {
    greetEl.textContent = `Hey, ${handle} — can you beat ${formatTip(best.tip)}?`
    statEl.textContent = `today's best: ${formatTip(best.tip)} · ${formatTime(best.ms)}`
  } else {
    greetEl.textContent = `Hey, ${handle} — nobody's delivered today yet.`
    statEl.textContent = 'be the first on the board'
  }

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

/* ============================================================
 * Robot renderer — ported verbatim from game/index.html's real
 * drawRobot() body sequence (same constants, same draw order, same
 * face-visibility tests; see labs/heading-reference.html for the
 * from Phaser Graphics calls to plain Canvas 2D path fills, so the
 * Phaser doesn't get bundled into the splash — the splash stays a
 * static-feeling tap target that renders instantly on every feed
 * impression, and only the actual game (tap to play) pulls Phaser in.
 * bobbing (bobZ=0) and roll/pitch/yaw perturbations (0) are static.
 * ============================================================ */

type Pt = {x: number; y: number; z: number}

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

const ROBOT_SKIN = {
  bodyTop: '#f7f8fa',
  bodyRight: '#e3e6ea',
  bodyLeft: '#c9cdd4',
  outline: '#30343d',
  stripe: '#c2452e',
  stripeDk: '#a03824',
  wheel: '#24262c',
  wheelDark: '#1a1c21',
  wheelHubFace: '#3d424c',
  wheelHub: '#8a919c',
  visor: '#22242b',
  eye: '#7fe3ff',
  lidInner: '#b2b7bf',
  cavityWall: '#9ba1a9',
  cavityFloor: '#7b818a',
  belly: '#494e58',
  flagPole: '#2e3138',
  flag: '#ff5722',
  skirtTop: '#3f434c',
  skirtRight: '#3a3d45',
  skirtLeft: '#2e3138',
} as const

const ROBOT_BODY = {hx: 26, hy: 20, z0: 14, z1: 54}
const ROBOT_LID = {hx: 22, hy: 16, z0: 54, z1: 61}
const ROBOT_STRIPE = {z0: 20, z1: 27}
const ROBOT_WHEEL = {r: 8, z: 10, xs: [-16, 0, 16], side: 22}
const ROBOT_FLAG = {base: {x: -25, y: 17}, z0: 54, z1: 97}

function convexHull(points: readonly Pt[]): Pt[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lo: Pt[] = []
  for (const p of sorted) {
    while (
      lo.length >= 2 &&
      cross(at(lo, lo.length - 2), at(lo, lo.length - 1), p) <= 0
    )
      lo.pop()
    lo.push(p)
  }
  const hi: Pt[] = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = at(sorted, i)
    while (
      hi.length >= 2 &&
      cross(at(hi, hi.length - 2), at(hi, hi.length - 1), p) <= 0
    )
      hi.pop()
    hi.push(p)
  }
  lo.pop()
  hi.pop()
  return lo.concat(hi)
}

function fillPoly(
  ctx: CanvasRenderingContext2D,
  pts: readonly Pt[],
  color: string,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  let started = false
  for (const p of pts) {
    if (!started) {
      ctx.moveTo(p.x, p.y)
      started = true
    } else {
      ctx.lineTo(p.x, p.y)
    }
  }
  ctx.closePath()
  ctx.fill()
}

function strokePoly(
  ctx: CanvasRenderingContext2D,
  pts: readonly Pt[],
  color: string,
  width = 2,
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  let started = false
  for (const p of pts) {
    if (!started) {
      ctx.moveTo(p.x, p.y)
      started = true
    } else {
      ctx.lineTo(p.x, p.y)
    }
  }
  ctx.closePath()
  ctx.stroke()
}

class RobotRenderer {
  roll = 0
  pitch = 0
  yaw = 0
  drawAngle = 0
  lidAng = 0.9
  lidHingeFlip = true
  botX = 0
  botY = 0
  botZ = 0
  wheelPhase = 0.6
  flagLean = 0
  tipT = 0
  camX = 0
  camY = 0
  camZ = 0
  readonly cx: number
  readonly cy: number
  readonly k: number
  private readonly ctx: CanvasRenderingContext2D

  constructor(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    k: number,
  ) {
    this.ctx = ctx
    this.cx = cx
    this.cy = cy
    this.k = k
  }

  private t(x: number, y: number, z: number): Pt {
    if (this.yaw !== 0) {
      const c = Math.cos(this.yaw)
      const s = Math.sin(this.yaw)
      const x2 = x * c - y * s
      y = x * s + y * c
      x = x2
    }
    if (this.pitch !== 0) {
      const c = Math.cos(this.pitch)
      const s = Math.sin(this.pitch)
      const x2 = x * c - z * s
      z = x * s + z * c
      x = x2
    }
    if (this.roll !== 0) {
      const piv = this.roll >= 0 ? 22 : -22
      const y0 = y + piv
      const c = Math.cos(this.roll)
      const s = Math.sin(this.roll)
      y = -piv + y0 * c - z * s
      z = y0 * s + z * c
    }
    if (this.drawAngle !== 0) {
      const c = Math.cos(this.drawAngle)
      const s = Math.sin(this.drawAngle)
      const x2 = x * c - y * s
      y = x * s + y * c
      x = x2
    }
    return {x, y, z}
  }

  private r(nx: number, ny: number, nz: number): Pt {
    if (this.yaw !== 0) {
      const cy = Math.cos(this.yaw)
      const sy = Math.sin(this.yaw)
      const nx2 = nx * cy - ny * sy
      ny = nx * sy + ny * cy
      nx = nx2
    }
    if (this.pitch !== 0) {
      const c = Math.cos(this.pitch)
      const s = Math.sin(this.pitch)
      const x2 = nx * c - nz * s
      nz = nx * s + nz * c
      nx = x2
    }
    const c = Math.cos(this.roll)
    const s = Math.sin(this.roll)
    const ny2 = ny * c - nz * s
    const nz2 = ny * s + nz * c
    let rx = nx
    let ry = ny2
    if (this.drawAngle !== 0) {
      const cy = Math.cos(this.drawAngle)
      const sy = Math.sin(this.drawAngle)
      const rx2 = rx * cy - ry * sy
      ry = rx * sy + ry * cy
      rx = rx2
    }
    return {x: rx, y: ry, z: nz2}
  }

  private w(x: number, y: number, z: number): Pt {
    const xr = x - this.camX
    const yr = y - this.camY
    return {
      x: (xr - yr) * this.k + this.cx,
      y: ((xr + yr) * 0.5 - (z - this.camZ)) * this.k + this.cy,
      z: 0,
    }
  }

  private p(x: number, y: number, z: number): Pt {
    const q = this.t(x, y, z)
    return this.w(q.x + this.botX, q.y + this.botY, q.z + this.botZ)
  }

  private depth(x: number, y: number, z: number): number {
    const q = this.t(x, y, z)
    return q.x + q.y + q.z * 0.4
  }

  private disc(c: Pt, radius: number, color: string): void {
    const pts: Pt[] = []
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      pts.push(
        this.p(c.x + Math.cos(a) * radius, c.y, c.z + Math.sin(a) * radius),
      )
    }
    fillPoly(this.ctx, pts, color)
  }

  private drawBox(
    b: {
      hx: number
      hy: number
      z0: number
      z1: number
      ox?: number
      oy?: number
    },
    cTop: string | null,
    cRight: string | null,
    cLeft: string | null,
    outline = true,
    decal = false,
    cBottom: string = ROBOT_SKIN.belly,
  ): void {
    const {hx, hy, z0, z1} = b
    const ox = b.ox ?? 0
    const oy = b.oy ?? 0
    const c = (sx: number, sy: number, sz: number) =>
      this.p(ox + sx * hx, oy + sy * hy, sz === 1 ? z1 : z0)
    const faces: {n: Pt; pts: Pt[]}[] = [
      {
        n: {x: 0, y: 0, z: 1},
        pts: [c(1, -1, 1), c(1, 1, 1), c(-1, 1, 1), c(-1, -1, 1)],
      },
      {
        n: {x: 0, y: 0, z: -1},
        pts: [c(1, -1, 0), c(1, 1, 0), c(-1, 1, 0), c(-1, -1, 0)],
      },
      {
        n: {x: 1, y: 0, z: 0},
        pts: [c(1, -1, 0), c(1, 1, 0), c(1, 1, 1), c(1, -1, 1)],
      },
      {
        n: {x: -1, y: 0, z: 0},
        pts: [c(-1, -1, 0), c(-1, 1, 0), c(-1, 1, 1), c(-1, -1, 1)],
      },
      {
        n: {x: 0, y: 1, z: 0},
        pts: [c(1, 1, 0), c(-1, 1, 0), c(-1, 1, 1), c(1, 1, 1)],
      },
      {
        n: {x: 0, y: -1, z: 0},
        pts: [c(1, -1, 0), c(-1, -1, 0), c(-1, -1, 1), c(1, -1, 1)],
      },
    ]
    for (const fc of faces) {
      if (decal && fc.n.z !== 0) continue
      const wv = this.r(fc.n.x, fc.n.y, fc.n.z)
      if (wv.x + wv.y + wv.z <= 0) continue
      let col: string | null
      if (!decal) {
        col = wv.z > 0.5 ? cTop : wv.x >= wv.y ? cRight : cLeft
        if (wv.z < -0.5) col = cBottom
      } else {
        col = wv.x >= wv.y ? cRight : cLeft
      }
      if (col === null) continue
      fillPoly(this.ctx, fc.pts, col)
      if (outline) strokePoly(this.ctx, fc.pts, ROBOT_SKIN.outline, 2)
    }
  }

  private drawWheel(c: {x: number; y: number; z: number}): void {
    const w2 = 6
    const ring = (oy: number, radius: number): Pt[] => {
      const pts: Pt[] = []
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2
        pts.push(
          this.p(c.x + Math.cos(a) * radius, oy, c.z + Math.sin(a) * radius),
        )
      }
      return pts
    }
    const b0 = c.y - w2 / 2
    const b1 = c.y + w2 / 2
    fillPoly(
      this.ctx,
      convexHull(ring(b0, ROBOT_WHEEL.r).concat(ring(b1, ROBOT_WHEEL.r))),
      ROBOT_SKIN.wheelDark,
    )
    const face = this.depth(c.x, b1, c.z) > this.depth(c.x, b0, c.z) ? b1 : b0
    const faceRing = ring(face, ROBOT_WHEEL.r)
    fillPoly(this.ctx, faceRing, ROBOT_SKIN.wheel)
    strokePoly(this.ctx, faceRing, ROBOT_SKIN.outline, 2)
    this.disc(
      {x: c.x, y: face, z: c.z},
      ROBOT_WHEEL.r * 0.55,
      ROBOT_SKIN.wheelHubFace,
    )
    const a = this.wheelPhase + c.x * 0.2
    this.disc(
      {
        x: c.x + Math.cos(a) * ROBOT_WHEEL.r * 0.34,
        y: face,
        z: c.z + Math.sin(a) * ROBOT_WHEEL.r * 0.34,
      },
      2.4,
      ROBOT_SKIN.wheelHub,
    )
  }

  private drawFlag(bobZ: number): void {
    const ctx = this.ctx
    const l = ROBOT_FLAG.z1 - ROBOT_FLAG.z0
    const bend = this.flagLean * 0.5 + this.tipT * 0.7
    const seg = 6
    let prev: Pt | null = null
    let last: Pt | null = null
    ctx.strokeStyle = ROBOT_SKIN.flagPole
    ctx.lineWidth = 3
    ctx.beginPath()
    for (let i = 0; i <= seg; i++) {
      const s = i / seg
      const a = bend * s
      const pt = this.p(
        ROBOT_FLAG.base.x,
        ROBOT_FLAG.base.y - Math.sin(a) * l * s,
        ROBOT_FLAG.z0 + Math.cos(a) * l * s + bobZ,
      )
      if (i === 0) ctx.moveTo(pt.x, pt.y)
      else ctx.lineTo(pt.x, pt.y)
      if (i === seg - 1) prev = pt
      if (i === seg) last = pt
    }
    ctx.stroke()
    if (!prev || !last) return
    let dx = last.x - prev.x
    let dy = last.y - prev.y
    const dl = Math.hypot(dx, dy) || 1
    dx /= dl
    dy /= dl
    ctx.fillStyle = ROBOT_SKIN.flag
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(last.x - dy * 11, last.y + dx * 11)
    ctx.lineTo(last.x + dx * 20, last.y + dy * 20 + 4)
    ctx.closePath()
    ctx.fill()
  }

  private flagNear(): boolean {
    return (
      this.depth(ROBOT_FLAG.base.x, ROBOT_FLAG.base.y, ROBOT_FLAG.z0 + 20) >
      this.depth(0, 0, 34)
    )
  }

  private lidNear(b: {
    hx: number
    hy: number
    z0: number
    z1: number
  }): boolean {
    if (this.lidAng < 0.15) return true
    const a = this.lidAng
    const c = Math.cos(a)
    const s = Math.sin(a)
    const yh = -b.hy
    const zh = b.z0
    const dy = -yh
    const dz = (b.z1 - b.z0) / 2
    return (
      this.depth(0, yh + dy * c - dz * s, zh + dy * s + dz * c) >
      this.depth(0, 0, 34)
    )
  }

  private drawLid(b: {hx: number; hy: number; z0: number; z1: number}): void {
    const {hx, hy, z0, z1} = b
    const a = this.lidAng
    const cA = Math.cos(a)
    const sA = Math.sin(a) * (this.lidHingeFlip ? -1 : 1)
    const yh = this.lidHingeFlip ? hy : -hy
    const zh = z0
    const h = (x: number, y: number, z: number): Pt => {
      const dy = y - yh
      const dz = z - zh
      return this.p(x, yh + dy * cA - dz * sA, zh + dy * sA + dz * cA)
    }
    const hn = (nx: number, ny: number, nz: number): Pt => {
      const ny2 = ny * cA - nz * sA
      const nz2 = ny * sA + nz * cA
      return this.r(nx, ny2, nz2)
    }
    const c = (sx: number, sy: number, sz: number) =>
      h(sx * hx, sy * hy, sz === 1 ? z1 : z0)
    const faces: {n: Pt; pts: Pt[]}[] = [
      {
        n: {x: 0, y: 0, z: 1},
        pts: [c(1, -1, 1), c(1, 1, 1), c(-1, 1, 1), c(-1, -1, 1)],
      },
      {
        n: {x: 0, y: 0, z: -1},
        pts: [c(1, -1, 0), c(1, 1, 0), c(-1, 1, 0), c(-1, -1, 0)],
      },
      {
        n: {x: 1, y: 0, z: 0},
        pts: [c(1, -1, 0), c(1, 1, 0), c(1, 1, 1), c(1, -1, 1)],
      },
      {
        n: {x: -1, y: 0, z: 0},
        pts: [c(-1, -1, 0), c(-1, 1, 0), c(-1, 1, 1), c(-1, -1, 1)],
      },
      {
        n: {x: 0, y: 1, z: 0},
        pts: [c(1, 1, 0), c(-1, 1, 0), c(-1, 1, 1), c(1, 1, 1)],
      },
      {
        n: {x: 0, y: -1, z: 0},
        pts: [c(1, -1, 0), c(-1, -1, 0), c(-1, -1, 1), c(1, -1, 1)],
      },
    ]
    for (const fc of faces) {
      const wv = hn(fc.n.x, fc.n.y, fc.n.z)
      if (wv.x + wv.y + wv.z <= 0) continue
      const col =
        wv.z > 0.5
          ? ROBOT_SKIN.bodyTop
          : wv.z < -0.5
            ? ROBOT_SKIN.lidInner
            : wv.x >= wv.y
              ? ROBOT_SKIN.bodyRight
              : ROBOT_SKIN.bodyLeft
      fillPoly(this.ctx, fc.pts, col)
      strokePoly(this.ctx, fc.pts, ROBOT_SKIN.outline, 2)
    }
  }

  draw(dv: {x: number; y: number}): void {
    const ctx = this.ctx
    const bobZ = 0
    this.drawAngle = Math.atan2(dv.y, dv.x)

    if (!this.flagNear()) this.drawFlag(bobZ)

    const wheels: {
      c: {x: number; y: number; z: number}
      near: boolean
      d: number
    }[] = []
    for (const side of [-1, 1]) {
      for (const wx of ROBOT_WHEEL.xs) {
        const c = {x: wx, y: side * ROBOT_WHEEL.side, z: ROBOT_WHEEL.z}
        wheels.push({
          c,
          near: this.depth(c.x, c.y, c.z) > this.depth(c.x, -c.y, c.z),
          d: this.depth(c.x, c.y, c.z),
        })
      }
    }
    wheels.sort((a, b) => a.d - b.d)
    for (const wobj of wheels) if (!wobj.near) this.drawWheel(wobj.c)

    const lidBox = {
      ...ROBOT_LID,
      z0: ROBOT_LID.z0 + bobZ,
      z1: ROBOT_LID.z1 + bobZ,
    }
    const lidIsNear = this.lidNear(lidBox)
    if (!lidIsNear) this.drawLid(lidBox)

    this.drawBox(
      {hx: 24, hy: 17, z0: 6, z1: ROBOT_BODY.z0 + 1},
      ROBOT_SKIN.skirtTop,
      ROBOT_SKIN.skirtRight,
      ROBOT_SKIN.skirtLeft,
      false,
    )
    this.drawBox(
      {...ROBOT_BODY, z0: ROBOT_BODY.z0 + bobZ, z1: ROBOT_BODY.z1 + bobZ},
      ROBOT_SKIN.bodyTop,
      ROBOT_SKIN.bodyRight,
      ROBOT_SKIN.bodyLeft,
    )
    this.drawBox(
      {
        hx: ROBOT_BODY.hx + 0.6,
        hy: ROBOT_BODY.hy + 0.6,
        z0: ROBOT_STRIPE.z0 + bobZ,
        z1: ROBOT_STRIPE.z1 + bobZ,
      },
      null,
      ROBOT_SKIN.stripe,
      ROBOT_SKIN.stripeDk,
      false,
      true,
    )
    if (this.lidAng > 0.12) {
      const wn = this.r(0, 0, 1)
      if (wn.x + wn.y + wn.z > 0) {
        const zc = ROBOT_LID.z0 + bobZ + 0.5
        const ring = (hx: number, hy: number): Pt[] => [
          this.p(hx, -hy, zc),
          this.p(hx, hy, zc),
          this.p(-hx, hy, zc),
          this.p(-hx, -hy, zc),
        ]
        fillPoly(
          ctx,
          ring(ROBOT_LID.hx - 2, ROBOT_LID.hy - 2),
          ROBOT_SKIN.cavityWall,
        )
        fillPoly(
          ctx,
          ring(ROBOT_LID.hx - 6, ROBOT_LID.hy - 6),
          ROBOT_SKIN.cavityFloor,
        )
      }
    }
    if (lidIsNear) this.drawLid(lidBox)

    const fn = this.r(1, 0, 0)
    if (fn.x + fn.y + fn.z > 0) {
      const f = (y: number, z: number) =>
        this.p(ROBOT_BODY.hx + 0.8, y, z + bobZ)
      const visorPts = [f(-13, 40), f(13, 40), f(13, 50), f(-13, 50)]
      fillPoly(ctx, visorPts, ROBOT_SKIN.visor)
      strokePoly(ctx, visorPts, ROBOT_SKIN.outline, 1.5)
      for (const ey of [-7, 7]) {
        const c = f(ey, 45)
        ctx.fillStyle = ROBOT_SKIN.eye
        ctx.beginPath()
        ctx.ellipse(c.x, c.y, 3.5, 3.5, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    for (const wobj of wheels) if (wobj.near) this.drawWheel(wobj.c)
    if (this.flagNear()) this.drawFlag(bobZ)
  }
}

/** Draws the robot at heading f=0 onto an oversized offscreen canvas,
 *  scans for the bounding box of visible pixels, then draws that crop
 *  scaled into the on-screen canvas at devicePixelRatio resolution.
 *  Auto-framing this way means the crop stays correct even if the pose
 *  constants above (lidAng, etc.) change later — no separate asset to
 *  re-export by hand. */
function renderRobotIcon(canvas: HTMLCanvasElement): void {
  const cssWidth = 88
  const workSize = 500

  const off = document.createElement('canvas')
  off.width = workSize
  off.height = workSize
  const offCtx = off.getContext('2d')
  if (!offCtx) return

  const renderer = new RobotRenderer(offCtx, workSize / 2, workSize * 0.66, 2.3)
  renderer.draw({x: 1, y: 0})

  // Fixed fallback bounds, measured once for this exact pose/camera setup
  // (cx=250, cy=330, K=2.3 on a 500x500 canvas). Used if getImageData is
  // blocked — some mobile/sandboxed webviews throw a SecurityError on
  // canvas readback as an anti-fingerprinting measure, and a blocked
  // read here must never take down the rest of the splash script.
  let minX = 126
  let minY = 71
  let maxX = 373
  let maxY = 386

  try {
    const {data} = offCtx.getImageData(0, 0, workSize, workSize)
    let scanMinX = workSize
    let scanMinY = workSize
    let scanMaxX = 0
    let scanMaxY = 0
    let found = false
    for (let y = 0; y < workSize; y++) {
      for (let x = 0; x < workSize; x++) {
        const alpha = data[(y * workSize + x) * 4 + 3] ?? 0
        if (alpha > 10) {
          found = true
          if (x < scanMinX) scanMinX = x
          if (x > scanMaxX) scanMaxX = x
          if (y < scanMinY) scanMinY = y
          if (y > scanMaxY) scanMaxY = y
        }
      }
    }
    if (found) {
      const pad = 10
      minX = Math.max(0, scanMinX - pad)
      minY = Math.max(0, scanMinY - pad)
      maxX = Math.min(workSize, scanMaxX + pad)
      maxY = Math.min(workSize, scanMaxY + pad)
    }
  } catch (err) {
    console.error('splash: getImageData blocked, using fixed crop', err)
  }

  const cropW = maxX - minX
  const cropH = maxY - minY

  const dpr = window.devicePixelRatio || 1
  const cssHeight = (cssWidth * cropH) / cropW
  canvas.width = cssWidth * dpr
  canvas.height = cssHeight * dpr
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${cssHeight}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.drawImage(
    off,
    minX,
    minY,
    cropW,
    cropH,
    0,
    0,
    canvas.width,
    canvas.height,
  )
}

/* ============================================================
 * Kickoff — deliberately last in the file. RobotRenderer is a
 * `class`, not a function; classes aren't hoisted the way function
 * declarations are, so anything that constructs one must run after
 * the class declaration has actually executed. Calling
 * renderRobotIcon() from up near the top (before this class exists)
 * worked in unminified test bundles but broke under the real
 * --minify'd build on-device — this ordering removes that ambiguity
 * entirely rather than relying on bundler-specific behavior.
 * ============================================================ */

const startBtn = document.getElementById('start-btn') as HTMLButtonElement
const greetEl = document.getElementById('greet') as HTMLParagraphElement
const statEl = document.getElementById('stat') as HTMLParagraphElement
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
