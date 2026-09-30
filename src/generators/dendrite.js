import { getPalette, paletteOptions } from '../core/palettes.js'

/**
 * Dendrite.
 *
 * A branch splits, each piece splits again, and the rule never changes — only
 * the scale it is applied at. Nerve cells, river deltas, frost on a window and
 * lightning all arrive at this shape from unrelated physics, because it is
 * what you get when something has to reach everywhere from one place.
 *
 * Built for showcase. Every parameter that decides *shape* — the angle between
 * siblings, how fast branches shorten, how much they curl — is continuous, and
 * none of them changes how many random numbers get drawn, so they can be swept
 * without the figure reshuffling underneath.
 */

const params = [
  { key: 'form', type: 'select', label: 'Form', options: [
    { value: 'centre', label: 'Radial' },
    { value: 'base', label: 'Upright' },
    { value: 'ring', label: 'Ring' },
  ], default: 'centre', structural: true },
  { key: 'roots', type: 'range', label: 'Limbs', min: 1, max: 12, step: 1, default: 5, structural: true, wander: 0.5 },
  { key: 'maxDepth', type: 'range', label: 'Depth', min: 2, max: 11, step: 1, default: 9, structural: true, wander: 0.4 },
  { key: 'branches', type: 'range', label: 'Split', min: 2, max: 4, step: 1, default: 2, structural: true },
  // The shape controls. All continuous, none structural — these are what
  // showcase sweeps.
  { key: 'spread', type: 'range', label: 'Spread', min: 0, max: 110, step: 0.2, default: 32 },
  { key: 'lengthRatio', type: 'range', label: 'Shortening', min: 0.45, max: 0.92, step: 0.002, default: 0.76, wander: 0.35 },
  { key: 'reach', type: 'range', label: 'Reach', min: 0.25, max: 1, step: 0.005, default: 0.88, wander: 0.3 },
  { key: 'curl', type: 'range', label: 'Curl', min: -45, max: 45, step: 0.2, default: 0 },
  { key: 'bow', type: 'range', label: 'Bow', min: -1, max: 1, step: 0.005, default: 0.18 },
  { key: 'wobble', type: 'range', label: 'Wobble', min: 0, max: 1, step: 0.005, default: 0.3 },
  { key: 'taper', type: 'range', label: 'Taper', min: 0.55, max: 1, step: 0.005, default: 0.82 },
  { key: 'lineWidth', type: 'range', label: 'Line width', min: 0.2, max: 7, step: 0.05, default: 2.6, wander: 0.3 },
  { key: 'tips', type: 'toggle', label: 'Tip dots', default: true },
  { key: 'tipSize', type: 'range', label: 'Tip size', min: 0.5, max: 9, step: 0.1, default: 2.6 },
  { key: 'opacity', type: 'range', label: 'Opacity', min: 0.15, max: 1, step: 0.01, default: 0.95, wander: 0.4 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 2, default: 40 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'ember' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.7 },
]

/**
 * A full tree is `branches^depth` wide, so the two structural dials multiply
 * catastrophically — 4 splits at depth 11 is four million segments. The budget
 * caps the total and depth gives way, the same bargain truchet makes with its
 * cell count.
 */
const SEGMENT_BUDGET = 14000

/**
 * Per-node randomness, drawn once for the whole budget rather than as the
 * recursion goes.
 *
 * Two reasons. A node's wobble is then tied to its position in the tree, so
 * raising Depth grows new twigs onto the existing figure instead of redrawing
 * a different one — the same trick the rosette's rings use. And the number of
 * rng draws stops depending on how big the tree actually came out, which is
 * what lets the shape parameters be swept without the piece reshuffling.
 */
function drawPool(rng, size) {
  const lean = new Float64Array(size)
  const stretch = new Float64Array(size)
  const tint = new Float64Array(size)
  for (let i = 0; i < size; i += 1) {
    lean[i] = rng.range(-1, 1)
    stretch[i] = rng.range(0.78, 1.22)
    tint[i] = rng.float()
  }
  return { lean, stretch, tint }
}

const r1 = (n) => Math.round(n * 10) / 10

export default {
  id: 'dendrite',
  name: 'Dendrite',
  blurb: 'One rule applied at every scale. Nerves, rivers and frost all end up here.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = [...palette.colors].reverse()

    const branches = Math.round(p.branches)
    const roots = Math.round(p.roots)

    // How deep the budget actually allows. Geometric series per root:
    // (b^(d+1) - 1) / (b - 1).
    const perRoot = Math.max(1, Math.floor(SEGMENT_BUDGET / roots))
    let maxDepth = 0
    while (maxDepth < p.maxDepth) {
      const next = (branches ** (maxDepth + 2) - 1) / (branches - 1)
      if (next > perRoot) break
      maxDepth += 1
    }

    const pool = drawPool(rng, Math.min(SEGMENT_BUDGET, 16384))
    const poolSize = pool.lean.length

    const span = Math.min(width, height) - p.margin * 2
    const cx = width / 2
    const cy = height / 2
    const spread = (p.spread * Math.PI) / 180
    const curl = (p.curl * Math.PI) / 180

    /**
     * The figure is grown at an arbitrary scale and fitted afterwards.
     *
     * Sizing it in advance cannot be done honestly: a limb's reach is a
     * geometric series, but branches also spread sideways, wobble stretches
     * any segment by up to 22%, and bow bends the whole thing — so a closed
     * form for the silhouette does not exist and every guess either clipped
     * the canopy or left the piece small. Growing first and measuring the real
     * bounding box is exact for every form and every combination of dials.
     *
     * It also holds the composition still. Sweeping Shortening or Depth in
     * showcase now changes how a limb is *subdivided* rather than how far it
     * gets, instead of inflating the piece off the canvas and back.
     */
    const ringRadius = span * 0.42
    const unit = span * 0.2

    const strokes = new Map()
    const dots = new Map()

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    const see = (x, y) => {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }

    const addStroke = (depth, ink, d) => {
      const key = depth + '|' + ink
      let entry = strokes.get(key)
      if (!entry) {
        entry = { depth, ink, parts: [] }
        strokes.set(key, entry)
      }
      entry.parts.push(d)
    }

    const grow = (index, x, y, angle, length, depth, ink) => {
      if (depth > maxDepth) return
      const slot = index % poolSize

      const lean = pool.lean[slot] * p.wobble
      const heading = angle + curl + lean * spread * 0.5
      const reach = length * (1 + (pool.stretch[slot] - 1) * p.wobble)

      const x2 = x + Math.cos(heading) * reach
      const y2 = y + Math.sin(heading) * reach

      // Bow the segment sideways by offsetting the quadratic control point
      // perpendicular to its run, so limbs arc instead of hingeing.
      const mx = (x + x2) / 2
      const my = (y + y2) / 2
      const px = -(y2 - y)
      const py = x2 - x
      const bow = p.bow * 0.35 * (pool.lean[slot] >= 0 ? 1 : -1)
      // A quadratic stays inside the triangle of its three points, so bounding
      // those bounds the curve.
      see(x, y)
      see(x2, y2)
      see(mx + px * bow, my + py * bow)
      addStroke(
        depth,
        ink,
        `M${r1(x)},${r1(y)}Q${r1(mx + px * bow)},${r1(my + py * bow)} ${r1(x2)},${r1(y2)}`,
      )

      if (depth === maxDepth) {
        if (p.tips) {
          const list = dots.get(ink) ?? []
          list.push([x2, y2])
          dots.set(ink, list)
        }
        return
      }

      const nextLength = reach * p.lengthRatio
      for (let k = 0; k < branches; k += 1) {
        const offset = (k - (branches - 1) / 2) * spread
        grow(index * branches + k + 1, x2, y2, heading + offset, nextLength, depth + 1, ink)
      }
    }

    for (let r = 0; r < roots; r += 1) {
      const tint = pool.tint[r % poolSize]
      const ink = inks[Math.min(inks.length - 1, Math.floor(tint ** (1 + p.colorBias) * inks.length))]
      // Each root owns a disjoint slice of the pool, so limbs don't come out
      // as copies of one another.
      const base = r * 1409

      if (p.form === 'base') {
        const x = ((r + 0.5) / roots) * span
        grow(base, x, span, -Math.PI / 2, unit, 0, ink)
      } else if (p.form === 'ring') {
        // Rooted around the rim and growing inward, so the limbs meet in the
        // middle and close into a wreath rather than flying apart.
        const a = (r / roots) * Math.PI * 2
        grow(base, cx + Math.cos(a) * ringRadius, cy + Math.sin(a) * ringRadius, a + Math.PI, unit, 0, ink)
      } else {
        const a = (r / roots) * Math.PI * 2
        grow(base, cx, cy, a, unit, 0, ink)
      }
    }

    const drawn = []
    for (const { depth, ink, parts } of strokes.values()) {
      drawn.push({
        tag: 'path',
        attrs: {
          d: parts.join(''),
          fill: 'none',
          stroke: ink,
          'stroke-width': Math.max(0.15, r1(p.lineWidth * p.taper ** depth)),
          'stroke-opacity': p.opacity.toFixed(3),
          'stroke-linecap': 'round',
        },
      })
    }

    // Tips as one path of tiny circles per ink, rather than a few thousand
    // <circle> elements.
    if (p.tips) {
      const rad = p.tipSize / 2
      for (const [ink, list] of dots) {
        const d = list
          .map(([x, y]) => `M${r1(x - rad)},${r1(y)}a${r1(rad)},${r1(rad)} 0 1,0 ${r1(rad * 2)},0a${r1(rad)},${r1(rad)} 0 1,0 ${r1(-rad * 2)},0`)
          .join('')
        drawn.push({ tag: 'path', attrs: { d, fill: ink, 'fill-opacity': p.opacity.toFixed(3) } })
      }
    }

    // Fit the measured silhouette into the frame. Reach is then literally how
    // much of the frame the piece occupies, whatever the other dials are doing.
    const figureW = Math.max(1e-6, maxX - minX)
    const figureH = Math.max(1e-6, maxY - minY)
    const box = Math.min(width, height) - p.margin * 2
    const fit = (Math.min(box / figureW, box / figureH) * p.reach) || 1
    const offsetX = width / 2 - ((minX + maxX) / 2) * fit
    const offsetY = height / 2 - ((minY + maxY) / 2) * fit

    const shapes = [
      {
        tag: 'g',
        attrs: { transform: `translate(${r1(offsetX)} ${r1(offsetY)}) scale(${fit.toFixed(5)})` },
        children: drawn,
      },
    ]

    return { width, height, background: palette.bg, shapes }
  },
}
