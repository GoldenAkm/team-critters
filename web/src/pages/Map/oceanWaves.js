// Live ocean behind the Interactive Map: rows of slow wave lines, each a mix of swells that rise and calm along
// its length, bending in long curves, with light shimmering along the crests. Here and there a slow eddy twists
// the lines passing it into a swirl. Drawn on one fixed canvas behind the page content. The rows drift up at a
// third of the scroll speed, like looking down through water.

const TAU = Math.PI * 2
const SPACING = 54 // px between rows
const STEP = 5 // px between points along a row
// Lines are drawn this far past every screen edge, so a swirl near an edge never pulls a line's end into view
const OVERHANG = 400
const PARALLAX = 0.35

// Same pseudo-random value for a row every frame, so each row keeps its own shape as it scrolls by
function seed(n) {
  const s = Math.sin(n * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

// Eddies: at most one per cell of this grid (in page space, so each stays put as the page scrolls)
const EDDY_CELL = { w: 460, h: 360 }

function eddiesNear(left, right, top, bottom, t) {
  const list = []
  for (let j = Math.floor(top / EDDY_CELL.h) - 1; j <= Math.floor(bottom / EDDY_CELL.h) + 1; j++) {
    for (let i = Math.floor(left / EDDY_CELL.w) - 1; i <= Math.floor(right / EDDY_CELL.w) + 1; i++) {
      const k = i * 31 + j * 57
      if (seed(k + 3) < 0.1) continue
      const phase = seed(k + 5) * TAU
      const radius = 60 + 70 * seed(k + 9)
      list.push({
        x: (i + 0.15 + 0.7 * seed(k + 1)) * EDDY_CELL.w + 24 * Math.sin(t * 0.05 + phase),
        y: (j + 0.15 + 0.7 * seed(k + 2)) * EDDY_CELL.h + 12 * Math.cos(t * 0.04 + phase),
        r2: radius * radius,
        reach: (2.6 * radius) ** 2,
        // Turn at the centre, in radians: either direction, breathing slowly
        turn: (seed(k + 4) < 0.5 ? -1 : 1) * (1.8 + 1.2 * seed(k + 6)) * (0.85 + 0.15 * Math.sin(t * 0.2 + phase)),
      })
    }
  }
  return list
}

// Rotates a point around each nearby eddy, more the closer it is to the centre, so a straight line through
// an eddy curls into a spiral
function swirl(eddies, x, y) {
  for (const e of eddies) {
    const dx = x - e.x
    const dy = y - e.y
    const d2 = dx * dx + dy * dy
    if (d2 > e.reach) continue
    const angle = e.turn * Math.exp(-d2 / e.r2)
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    x = e.x + dx * cos - dy * sin
    y = e.y + dx * sin + dy * cos
  }
  return [x, y]
}

// A slow current that bends every row, varying smoothly across the page: neighbouring rows bend together, like
// contour lines, so the curves cover the whole screen and rows never cross
function current(x, y, t) {
  return (
    24 * Math.sin(x * 0.0042 + y * 0.004 + t * 0.04) * Math.cos(x * 0.0026 - y * 0.0027 + 1.3 - t * 0.03) +
    14 * Math.sin(x * 0.0072 - y * 0.0036 + 2.1 + t * 0.05)
  )
}

function waveY(row, x, t) {
  const a = seed(row)
  const b = seed(row + 101)
  const c = seed(row + 211)
  // Swell height rises and falls along the line (calm stretches, livelier ones), different on every row
  const envelope = 0.5 + 0.5 * Math.sin(x * (0.0012 + 0.001 * c) + t * 0.06 + c * TAU)
  const amp = 3.5 + 8 * envelope * envelope * (0.4 + 0.6 * a)
  const swell = amp * (
    0.7 * Math.sin(x * (0.003 + 0.003 * b) + t * (0.15 + 0.12 * a) + a * TAU) +
    0.3 * Math.sin(x * (0.008 + 0.004 * c) - t * (0.2 + 0.15 * b) + b * TAU)
  )
  return swell + current(x, row * SPACING, t)
}

export function startOceanWaves(canvas) {
  const g = canvas.getContext('2d')
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const start = performance.now()
  let width = 0
  let height = 0
  let frame = 0

  function draw(now) {
    frame = 0
    const t = reduceMotion ? 0 : (now - start) / 1000
    g.clearRect(0, 0, width, height)
    const offset = window.scrollY * PARALLAX
    const first = Math.floor((offset - OVERHANG) / SPACING)
    const last = Math.ceil((offset + height + OVERHANG) / SPACING)
    const eddies = eddiesNear(-OVERHANG, width + OVERHANG, offset - OVERHANG, offset + height + OVERHANG, t)

    for (let row = first; row <= last; row++) {
      g.beginPath()
      for (let x = -OVERHANG; x <= width + OVERHANG; x += STEP) {
        const [sx, sy] = swirl(eddies, x, row * SPACING + waveY(row, x, t))
        if (x === -OVERHANG) g.moveTo(sx, sy - offset)
        else g.lineTo(sx, sy - offset)
      }
      const alpha = 0.07 + 0.03 * seed(row + 7)
      // The swell itself
      g.setLineDash([])
      g.lineWidth = 1
      g.strokeStyle = `rgba(120, 214, 232, ${alpha})`
      g.stroke()
      // Light running along it
      g.setLineDash([40 + 60 * seed(row + 13), 180 + 220 * seed(row + 17)])
      g.lineDashOffset = -t * (30 + 40 * seed(row + 19)) - 500 * seed(row + 23)
      g.lineWidth = 1.2
      g.strokeStyle = `rgba(190, 240, 250, ${alpha * 2.6})`
      g.stroke()
    }
    if (!reduceMotion) frame = requestAnimationFrame(draw)
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    width = window.innerWidth
    height = window.innerHeight
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (reduceMotion || !frame) draw(performance.now())
  }

  // Still scene with reduced motion: redraw only when the view changes
  const onScroll = () => {
    if (reduceMotion && !frame) frame = requestAnimationFrame(draw)
  }

  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('scroll', onScroll, { passive: true })
  return () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', resize)
    window.removeEventListener('scroll', onScroll)
  }
}
