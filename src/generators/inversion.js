import { getPalette, legibleInks, paletteOptions } from '../core/palettes.js'

/**
 * Circle inversion.
 *
 * Reflection in a circle: every point is pushed out along its own radius to
 * the distance that makes the product of the two distances equal r squared.
 * The centre goes to infinity, the outside comes inside, and — the fact the
 * whole piece rests on — a circle maps to another circle. Never an ellipse,
 * never an egg.
 *
 * So take a ring of circles and reflect each one through the others, then
 * reflect the reflections, and keep going. Nothing is placed and nothing is
 * checked for collisions: the packing that appears, with every circle exactly
 * tangent to its neighbours, is the orbit of a group. Where it accumulates —
 * the fractal dust the circles crowd toward but never reach — is the group's
 * limit set.
 *
 * This is the only piece here where scale is a law rather than a setting.
 * Every other one draws at a scale you chose; this one hands you a cascade
 * that halves and halves toward a boundary, and the detail dial is a floor on
 * how small a circle is worth drawing rather than a size.
 *
 * Built for showcase: the ring size is structural, but the kiss — how hard
 * the generating circles overlap — is continuous, and it is the parameter
 * worth watching. At 1 the ring is exactly tangent and the figure is a
 * gasket; below, it opens into dust; above, the circles cut through each
 * other and the orbit spirals.
 */

const params = [
  { key: 'arms', type: 'range', label: 'Ring', min: 3, max: 9, step: 1, default: 5, structural: true },
  { key: 'bound', type: 'toggle', label: 'Enclosing circle', default: true },
  /**
   * The knob, and the one place this piece needs a fence around it.
   *
   * At 1 the generating circles are exactly tangent and the group they
   * generate is discrete: the orbit converges, every image nests inside its
   * mirror, and the figure closes. Push them into each other and it stops
   * being discrete — the orbit no longer settles, the tree explodes against
   * whatever budget it is given, and which circles survive depends on the
   * order they were visited. That is not a wilder picture, it is a truncated
   * one, and truncation shows up in animation as popping. So the range stops
   * just past tangency, and all the expression is below it: dust at 0.72,
   * closing to a gasket at 1.
   */
  { key: 'kiss', type: 'range', label: 'Kiss', min: 0.72, max: 1.02, step: 0.002, default: 1, wander: 0.35 },
  { key: 'detail', type: 'range', label: 'Detail', min: 0.6, max: 14, step: 0.05, default: 1.5, wander: 0.28 },
  { key: 'depth', type: 'range', label: 'Reflections', min: 1, max: 14, step: 1, default: 11, structural: true, wander: 0.5 },
  { key: 'zoom', type: 'range', label: 'Zoom', min: 0.3, max: 2.6, step: 0.005, default: 0.98, wander: 0.35 },
  { key: 'spin', type: 'range', label: 'Spin', min: 0, max: 360, step: 0.2, default: 0 },
  // Same fence: an enclosing circle smaller than the ring cuts through it, and
  // overlapping mirrors are the non-discrete case again.
  { key: 'swell', type: 'range', label: 'Swell', min: 1, max: 1.35, step: 0.005, default: 1 },
  { key: 'tint', type: 'select', label: 'Colour by', options: [
    { value: 'depth', label: 'Reflection depth' },
    { value: 'size', label: 'Size' },
    { value: 'arm', label: 'Which circle' },
    { value: 'scatter', label: 'Scattered' },
  ], default: 'depth' },
  { key: 'fill', type: 'range', label: 'Fill', min: 0, max: 1, step: 0.01, default: 0 },
  { key: 'lineWidth', type: 'range', label: 'Line width', min: 0.1, max: 5, step: 0.05, default: 0.9, wander: 0.3 },
  { key: 'fade', type: 'range', label: 'Fade with depth', min: 0, max: 1, step: 0.005, default: 0.35 },
  { key: 'opacity', type: 'range', label: 'Opacity', min: 0.1, max: 1, step: 0.01, default: 0.9, wander: 0.45 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 50 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'neon' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.6 },
]

/**
 * The orbit is a tree branching `arms` ways at every level, so it runs away
 * even faster than dendrite's. Two things hold it: a floor on how small a
 * circle is worth drawing, which is what actually shapes the figure, and this,
 * which is only ever a backstop.
 */
const CIRCLE_BUDGET = 9000

const r1 = (n) => Math.round(n * 10) / 10

/**
 * Reflect circle `c` in circle `g`.
 *
 * The standard closed form: a circle not through the centre of inversion maps
 * to a circle whose radius scales by |s| and whose centre moves to `o + s(c-o)`
 * — note that this is *not* the image of the old centre, which is a thing
 * inversion does not preserve.
 *
 * Returns null when the source passes too close to the centre of `g`: there
 * the image is a line, or numerically an enormous circle, and either way it is
 * not part of the figure.
 */
function reflect(c, g) {
  const dx = c.x - g.x
  const dy = c.y - g.y
  const power = dx * dx + dy * dy - c.r * c.r
  if (Math.abs(power) < 1e-9) return null
  const s = (g.r * g.r) / power
  return { x: g.x + dx * s, y: g.y + dy * s, r: Math.abs(s) * c.r }
}

export default {
  id: 'inversion',
  name: 'Circle Inversion',
  blurb: 'Circles reflected through circles, forever.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = legibleInks(palette).slice().reverse()

    // The only randomness here: the ink a circle takes when colour is
    // scattered. The figure itself is forced by the geometry.
    const scatter = new Float64Array(1024)
    for (let i = 0; i < scatter.length; i += 1) scatter[i] = rng.float()

    const arms = Math.round(p.arms)
    const spin = (p.spin * Math.PI) / 180

    /**
     * The generating circles: `arms` of them on a ring, plus optionally the
     * circle that encloses them all.
     *
     * Ring radius 1, and neighbours are exactly tangent when their radius is
     * sin(pi / arms) — `kiss` is that, scaled. Everything downstream follows
     * from these few circles.
     */
    const touch = Math.sin(Math.PI / arms)
    const gens = []
    for (let i = 0; i < arms; i += 1) {
      const a = (i / arms) * Math.PI * 2 + spin
      gens.push({ x: Math.cos(a), y: Math.sin(a), r: touch * p.kiss, arm: i })
    }
    if (p.bound) gens.push({ x: 0, y: 0, r: (1 + touch * p.kiss) * p.swell, arm: arms })

    // Fit the generating ring to the frame. The orbit lives inside it, so this
    // frames the whole figure whatever the reflections do.
    const span = (1 + touch * p.kiss) * Math.max(p.swell, 1)
    const box = Math.min(width, height) - p.margin * 2
    const scale = ((box / 2) / span) * p.zoom
    const cx = width / 2
    const cy = height / 2

    // In canvas units, so the detail floor means pixels on the page rather
    // than a number in an abstract coordinate space.
    const floor = p.detail / scale

    const drawn = []
    const push = (c, depth, arm) => {
      drawn.push({ x: c.x, y: c.y, r: c.r, depth, arm })
    }
    for (const g of gens) push(g, 0, g.arm)

    /**
     * Walk the orbit.
     *
     * A reflection is its own inverse, so a word that uses the same circle
     * twice in a row goes nowhere — skipping that is what turns an exponential
     * blow-up into a tree that actually terminates, along with the size floor.
     */
    const maxDepth = Math.round(p.depth)
    const walk = (c, from, depth) => {
      if (depth >= maxDepth || drawn.length >= CIRCLE_BUDGET) return
      for (let i = 0; i < gens.length; i += 1) {
        if (i === from) continue
        const image = reflect(c, gens[i])
        if (!image || image.r < floor) continue
        // An image of something outside the mirror lands inside it, so a
        // circle bigger than its own mirror means the numbers have run away.
        if (image.r > gens[i].r * 1.0001) continue
        push(image, depth + 1, c.arm ?? gens[i].arm)
        walk({ ...image, arm: c.arm }, i, depth + 1)
        if (drawn.length >= CIRCLE_BUDGET) return
      }
    }

    for (let i = 0; i < gens.length; i += 1) {
      for (let j = 0; j < gens.length; j += 1) {
        if (i === j) continue
        const image = reflect(gens[j], gens[i])
        if (!image || image.r < floor || image.r > gens[i].r * 1.0001) continue
        push(image, 1, gens[j].arm)
        walk({ ...image, arm: gens[j].arm }, i, 1)
      }
    }

    let deepest = 1
    for (const c of drawn) if (c.depth > deepest) deepest = c.depth

    // Largest first, so the cascade paints back to front. Without it a filled
    // piece is a few enormous discs with the whole orbit hidden underneath —
    // the one thing worth seeing, covered by its own first generation.
    drawn.sort((a, b) => b.r - a.r)

    const groups = new Map()
    for (let i = 0; i < drawn.length; i += 1) {
      const c = drawn[i]
      const r = c.r * scale
      if (r < 0.25) continue
      const x = cx + c.x * scale
      const y = cy + c.y * scale
      // Off-canvas circles cost path data nobody sees. The enclosing circle is
      // large on purpose, so this only drops orbits that ran outward.
      if (x + r < -box || x - r > width + box || y + r < -box || y - r > height + box) continue

      let slot
      if (p.tint === 'arm') slot = c.arm
      else if (p.tint === 'size') slot = Math.floor((1 - Math.min(1, c.r / span)) ** (1 + p.colorBias) * inks.length)
      else if (p.tint === 'scatter') slot = Math.floor(scatter[i % scatter.length] ** (1 + p.colorBias) * inks.length)
      else slot = Math.floor(((c.depth / deepest) ** (1 + p.colorBias)) * inks.length)

      const ink = inks[((slot % inks.length) + inks.length) % inks.length]
      // Deeper reflections can recede, which reads as the cascade going away
      // from you rather than as a flat pattern of rings.
      const alpha = p.opacity * (1 - p.fade * (c.depth / (deepest + 1)))
      const key = `${ink}|${alpha.toFixed(2)}`
      const list = groups.get(key) ?? { ink, alpha, parts: [] }
      list.parts.push(
        `M${r1(x - r)},${r1(y)}a${r1(r)},${r1(r)} 0 1,0 ${r1(r * 2)},0a${r1(r)},${r1(r)} 0 1,0 ${r1(-r * 2)},0`,
      )
      groups.set(key, list)
    }

    const shapes = []
    for (const { ink, alpha, parts } of groups.values()) {
      const attrs = { d: parts.join('') }
      if (p.fill > 0) {
        attrs.fill = ink
        attrs['fill-opacity'] = (alpha * p.fill).toFixed(3)
        attrs['fill-rule'] = 'evenodd'
      } else {
        attrs.fill = 'none'
      }
      if (p.lineWidth > 0) {
        attrs.stroke = ink
        attrs['stroke-width'] = r1(p.lineWidth)
        attrs['stroke-opacity'] = alpha.toFixed(3)
      }
      shapes.push({ tag: 'path', attrs })
    }

    // Clipped to the mat: the orbit reaches well past the frame — the whole
    // point of an enclosing circle is that things come back from outside it —
    // and an unclipped scene spills over anything it is composed into.
    const frameW = width - p.margin * 2
    const frameH = height - p.margin * 2
    const clipId = `inversion-${Math.round(width)}x${Math.round(height)}-${Math.round(p.margin)}`
    const framed = [
      {
        tag: 'clipPath',
        attrs: { id: clipId },
        children: [{ tag: 'rect', attrs: { x: r1(p.margin), y: r1(p.margin), width: r1(frameW), height: r1(frameH) } }],
      },
      { tag: 'g', attrs: { 'clip-path': `url(#${clipId})` }, children: shapes },
    ]

    return { width, height, background: palette.bg, shapes: framed }
  },
}
