import { getPalette, paletteOptions } from '@/core/palettes.js'

/**
 * Canopy.
 *
 * A trunk that keeps forking. Every other piece here is an allover pattern
 * with no particular orientation; this one has a root, a direction and a
 * silhouette — it's a figure on a ground rather than a field.
 *
 * Built for showcase: the tree's *structure* depends only on depth and fork
 * count, both structural, so the per-node randomness is drawn in a fixed order
 * and never changes. Angle, length and lean then move every branch
 * continuously, which reads as the whole thing swaying.
 */

const params = [
  { key: 'depth', type: 'range', label: 'Depth', min: 2, max: 11, step: 1, default: 9, structural: true },
  { key: 'forks', type: 'range', label: 'Forks', min: 2, max: 4, step: 1, default: 2, structural: true },
  { key: 'spread', type: 'range', label: 'Branch angle', min: 2, max: 70, step: 0.2, default: 26 },
  { key: 'lengthRatio', type: 'range', label: 'Length ratio', min: 0.5, max: 0.88, step: 0.002, default: 0.75 },
  { key: 'lean', type: 'range', label: 'Lean', min: -40, max: 40, step: 0.2, default: 0 },
  { key: 'curl', type: 'range', label: 'Curl', min: -1, max: 1, step: 0.005, default: 0 },
  { key: 'wander', type: 'range', label: 'Wander', min: 0, max: 1, step: 0.01, default: 0.4 },
  { key: 'trunk', type: 'range', label: 'Trunk length', min: 0.08, max: 0.4, step: 0.002, default: 0.22 },
  { key: 'thickness', type: 'range', label: 'Thickness', min: 0.5, max: 22, step: 0.1, default: 9 },
  { key: 'taper', type: 'range', label: 'Taper', min: 0.4, max: 0.95, step: 0.005, default: 0.72 },
  { key: 'opacity', type: 'range', label: 'Opacity', min: 0.1, max: 1, step: 0.01, default: 0.95 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 40 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'jade' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.7 },
]

const r1 = (n) => Math.round(n * 10) / 10

// 4 forks at depth 11 would be 4 million branches. Depth and forks are each
// reasonable alone; the product is not.
const MAX_BRANCHES = 12000

export default {
  id: 'canopy',
  name: 'Canopy',
  blurb: 'A trunk that keeps forking. A figure, not a field.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = [...palette.colors].reverse()

    const left = p.margin
    const right = width - p.margin
    const bottom = height - p.margin
    // A tree grows upward, so the trunk scales to the height available rather
    // than the smaller dimension — otherwise a portrait canvas leaves the top
    // third empty. Total height is roughly trunk / (1 - lengthRatio), so the
    // default trunk is set to land just inside the frame.
    // ...but capped against the width, or a narrow canvas gets a canopy half
    // again as wide as the frame. Some crop at the edges reads as natural for
    // a tree; losing whole limbs does not.
    const span = Math.min(bottom - p.margin, (right - left) * 1.3)

    // Group branches by depth so each generation shares one paint — a deep
    // tree is thousands of segments and they'd otherwise each carry their own.
    const levels = Array.from({ length: p.depth + 1 }, () => [])
    let branches = 0

    const grow = (x, y, angle, length, depth, width_) => {
      if (depth > p.depth || branches >= MAX_BRANCHES) return
      branches += 1

      // Drawn here rather than precomputed: recursion order is fixed and the
      // number of draws depends only on structural params, so the sequence is
      // stable while angle and length move.
      const wobble = rng.range(-1, 1)
      const lengthJitter = 1 + rng.range(-1, 1) * p.wander * 0.35
      const bend = rng.range(-1, 1)

      const drift = angle + wobble * p.wander * 0.5
      const reach = length * lengthJitter
      const endX = x + Math.sin(drift) * reach
      const endY = y - Math.cos(drift) * reach

      // A quadratic control point set off the chord gives the branch a curve
      // instead of a straight stick.
      const midX = (x + endX) / 2 + Math.cos(drift) * reach * p.curl * (0.5 + bend * 0.5)
      const midY = (y + endY) / 2 + Math.sin(drift) * reach * p.curl * (0.5 + bend * 0.5)

      levels[depth].push({
        d: `M${r1(x)},${r1(y)}Q${r1(midX)},${r1(midY)} ${r1(endX)},${r1(endY)}`,
        w: width_,
      })

      if (depth === p.depth) return

      const spreadRad = (p.spread * Math.PI) / 180
      const leanRad = (p.lean * Math.PI) / 180
      for (let f = 0; f < p.forks; f += 1) {
        // Fan the children evenly about the parent, then lean the whole fan.
        const offset = p.forks === 1 ? 0 : (f / (p.forks - 1) - 0.5) * 2
        grow(
          endX,
          endY,
          drift + offset * spreadRad + leanRad * 0.35,
          reach * p.lengthRatio,
          depth + 1,
          Math.max(0.2, width_ * p.taper),
        )
      }
    }

    grow(
      (left + right) / 2,
      bottom,
      (p.lean * Math.PI) / 180,
      span * p.trunk,
      0,
      p.thickness,
    )

    const shapes = []
    levels.forEach((level, depth) => {
      if (!level.length) return
      // Thickness varies within a level only by the taper chain, so grouping by
      // depth lets the group carry the stroke and the children carry only `d`.
      const ink = inks[Math.min(inks.length - 1, Math.floor((depth / (p.depth + 1)) * inks.length))]
      shapes.push({
        tag: 'g',
        attrs: {
          fill: 'none',
          stroke: ink,
          'stroke-width': r1(level[0].w),
          'stroke-opacity': p.opacity,
          'stroke-linecap': 'round',
        },
        children: level.map((b) => ({ tag: 'path', attrs: { d: b.d } })),
      })
    })

    return { width, height, background: palette.bg, shapes }
  },
}
