import { getPalette, paletteOptions } from '../core/palettes.js'

/**
 * Strange attractor (de Jong).
 *
 * Iterate two coupled trigonometric maps and plot every point you land on. The
 * orbit never repeats and never escapes, so it wears a path into the plane —
 * dense where it lingers, wispy where it passes through. Consecutive points
 * land nowhere near each other, so this is a cloud rather than a line: the one
 * piece here whose mark is a dot.
 *
 * The four constants are params, not seeds, which is the whole reason it
 * suits showcase — nudge one and the entire figure reorganises continuously.
 *
 * Not every set of constants is worth drawing: many collapse to a fixed point
 * or a thin limit cycle. The defaults were chosen by measuring how much of the
 * plane each candidate actually fills — these reach 66%, against 17% for the
 * first set I tried.
 */

const params = [
  { key: 'points', type: 'range', label: 'Points', min: 2000, max: 40000, step: 500, default: 26000, structural: true },
  // The four constants of the map. Only some of the square they describe is
  // strange: elsewhere the orbit collapses to a point or flies off the canvas,
  // and a randomised piece lands on an empty page. Hence the narrow `wander` —
  // a roll explores the neighbourhood of a known set rather than the whole
  // parameter space. Dragging the sliders still reaches all of it.
  { key: 'a', type: 'range', label: 'A', min: -3, max: 3, step: 0.001, default: 1.4, wander: 0.1 },
  { key: 'b', type: 'range', label: 'B', min: -3, max: 3, step: 0.001, default: -2.3, wander: 0.1 },
  { key: 'c', type: 'range', label: 'C', min: -3, max: 3, step: 0.001, default: 2.4, wander: 0.1 },
  { key: 'd', type: 'range', label: 'D', min: -3, max: 3, step: 0.001, default: -2.1, wander: 0.1 },
  { key: 'spread', type: 'range', label: 'Seed spread', min: 0, max: 0.25, step: 0.005, default: 0.07 },
  { key: 'zoom', type: 'range', label: 'Zoom', min: 0.3, max: 1.6, step: 0.005, default: 1.02 },
  { key: 'spin', type: 'range', label: 'Spin', min: 0, max: 360, step: 0.5, default: 0 },
  { key: 'dotSize', type: 'range', label: 'Dot size', min: 0.3, max: 4, step: 0.05, default: 1.35 },
  { key: 'opacity', type: 'range', label: 'Opacity', min: 0.05, max: 1, step: 0.01, default: 0.62, wander: 0.5 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 50 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'aurora' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.5 },
]

const r1 = (n) => Math.round(n * 10) / 10

// The map's output is bounded by [-2, 2] on both axes.
const EXTENT = 2

/**
 * Does this set of constants actually draw anything?
 *
 * Plenty of them collapse to a fixed point or a hairline cycle. Bounding-box
 * span is the obvious test and the wrong one — a thin loop can span the whole
 * plane while filling almost none of it. Counting occupied cells measures what
 * actually fails: a dud lands on a handful, a good set on hundreds.
 *
 * It must start from the same point the render does. Some constant sets have
 * two basins — rich from one start, a fixed point from another — so probing
 * from a fixed origin passes sets that then render blank.
 */
const PROBE_BINS = 24
const PROBE_POINTS = 1500
const PROBE_MIN_CELLS = 60

function drawsSomething(a, b, c, d, fromX, fromY) {
  let x = fromX
  let y = fromY
  for (let i = 0; i < 250; i += 1) {
    const nx = Math.sin(a * y) - Math.cos(b * x)
    y = Math.sin(c * x) - Math.cos(d * y)
    x = nx
  }

  const hit = new Uint8Array(PROBE_BINS * PROBE_BINS)
  let cells = 0
  for (let i = 0; i < PROBE_POINTS; i += 1) {
    const nx = Math.sin(a * y) - Math.cos(b * x)
    y = Math.sin(c * x) - Math.cos(d * y)
    x = nx
    const bx = Math.min(PROBE_BINS - 1, Math.max(0, (((x + EXTENT) / (EXTENT * 2)) * PROBE_BINS) | 0))
    const by = Math.min(PROBE_BINS - 1, Math.max(0, (((y + EXTENT) / (EXTENT * 2)) * PROBE_BINS) | 0))
    const at = by * PROBE_BINS + bx
    if (!hit[at]) {
      hit[at] = 1
      cells += 1
      if (cells >= PROBE_MIN_CELLS) return true
    }
  }
  return false
}

export default {
  id: 'attractor',
  name: 'Attractor',
  blurb: 'A dust of points, settling into wings.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = [...palette.colors].reverse()

    // Spent up front: a small per-seed offset on each constant, so seeds give
    // different attractors while the constants stay continuous params, and the
    // ink each band of the orbit is drawn in.
    const jitter = [
      rng.range(-1, 1) * p.spread,
      rng.range(-1, 1) * p.spread,
      rng.range(-1, 1) * p.spread,
      rng.range(-1, 1) * p.spread,
    ]
    const startX = rng.range(-0.3, 0.3)
    const startY = rng.range(-0.3, 0.3)
    const bandInks = inks.map((ink) => ink)
    const bandOrder = rng.int(0, inks.length - 1)

    // Back the per-seed jitter off until the constants draw something. Uses no
    // further randomness, so the piece stays reproducible.
    let strength = 1
    while (
      strength > 0 &&
      !drawsSomething(
        p.a + jitter[0] * strength,
        p.b + jitter[1] * strength,
        p.c + jitter[2] * strength,
        p.d + jitter[3] * strength,
        startX,
        startY,
      )
    ) {
      strength = strength <= 0.125 ? 0 : strength / 2
    }

    const a = p.a + jitter[0] * strength
    const b = p.b + jitter[1] * strength
    const c = p.c + jitter[2] * strength
    const d = p.d + jitter[3] * strength

    const size = Math.min(width, height) - p.margin * 2
    const scale = (size / (EXTENT * 2)) * p.zoom
    const cx = width / 2
    const cy = height / 2
    const spin = (p.spin * Math.PI) / 180
    const cosSpin = Math.cos(spin)
    const sinSpin = Math.sin(spin)

    // One path per ink, built as a string of zero-length subpaths. A zero-length
    // subpath with a round linecap renders as a dot, so thousands of points cost
    // a handful of elements instead of thousands.
    const bands = bandInks.map(() => [])

    let x = startX
    let y = startY

    // Let the orbit settle onto the attractor before anything is recorded,
    // otherwise the approach from the starting point draws a visible tail.
    for (let i = 0; i < 100; i += 1) {
      const nx = Math.sin(a * y) - Math.cos(b * x)
      y = Math.sin(c * x) - Math.cos(d * y)
      x = nx
    }

    const bandCount = bands.length
    for (let i = 0; i < p.points; i += 1) {
      const nx = Math.sin(a * y) - Math.cos(b * x)
      y = Math.sin(c * x) - Math.cos(d * y)
      x = nx

      const rx = x * cosSpin - y * sinSpin
      const ry = x * sinSpin + y * cosSpin
      const px = cx + rx * scale
      const py = cy + ry * scale

      // Colour follows position in the orbit, so the ink shifts as the point
      // travels rather than scattering at random.
      const band = ((i * bandCount) / p.points + bandOrder) % bandCount | 0
      bands[band].push(`M${r1(px)},${r1(py)}h0`)
    }

    const shapes = []
    for (let i = 0; i < bandCount; i += 1) {
      if (!bands[i].length) continue
      shapes.push({
        tag: 'path',
        attrs: {
          d: bands[i].join(''),
          fill: 'none',
          stroke: bandInks[i],
          'stroke-width': p.dotSize,
          'stroke-opacity': p.opacity,
          'stroke-linecap': 'round',
        },
      })
    }

    return { width, height, background: palette.bg, shapes }
  },
}
