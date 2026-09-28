import { getPalette, paletteOptions } from '../core/palettes.js'

/**
 * Lens.
 *
 * A flat grid with invisible lenses sitting on it, each bulging or pinching
 * whatever falls inside its reach. Nothing is drawn except the grid — the
 * shapes come entirely from what the lenses do to it, which is the op-art
 * trick: the eye reads depth that isn't there.
 *
 * Built for showcase: the lenses are placed once and then orbited. Spinning
 * them sweeps the distortion across a lattice that never changes, so cell
 * count is fixed while every cell is moving.
 */

const params = [
  { key: 'grid', type: 'range', label: 'Grid', min: 4, max: 44, step: 1, default: 18, structural: true },
  { key: 'lenses', type: 'range', label: 'Lenses', min: 1, max: 6, step: 1, default: 3, structural: true },
  { key: 'strength', type: 'range', label: 'Strength', min: -1.2, max: 1.2, step: 0.005, default: 0.62 },
  { key: 'reach', type: 'range', label: 'Reach', min: 0.1, max: 1.4, step: 0.005, default: 0.62 },
  { key: 'spin', type: 'range', label: 'Spin', min: 0, max: 360, step: 0.2, default: 0 },
  { key: 'orbit', type: 'range', label: 'Orbit', min: 0, max: 0.7, step: 0.005, default: 0.28 },
  { key: 'twist', type: 'range', label: 'Twist', min: -1.2, max: 1.2, step: 0.005, default: 0 },
  { key: 'fill', type: 'select', label: 'Cells', options: [
    { value: 'checker', label: 'Checker' },
    { value: 'rings', label: 'Rings' },
    { value: 'none', label: 'Outline only' },
  ], default: 'checker' },
  { key: 'inset', type: 'range', label: 'Cell gap', min: 0, max: 0.4, step: 0.005, default: 0 },
  { key: 'edge', type: 'range', label: 'Edge', min: 0, max: 4, step: 0.05, default: 0 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 30 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'ultra' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.5 },
]

const r1 = (n) => Math.round(n * 10) / 10

export default {
  id: 'lens',
  name: 'Lens',
  blurb: 'A flat grid, and invisible lenses bulging it. The depth is a trick.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = [...palette.colors].reverse()

    // Spent up front, for the maximum lens count, so changing `lenses` doesn't
    // move the ones that remain.
    const seeds = Array.from({ length: 6 }, (_, i) => ({
      angle: rng.range(0, Math.PI * 2),
      distance: rng.range(0.15, 1),
      size: rng.range(0.6, 1.3),
      sign: i === 0 ? 1 : rng.bool(0.65) ? 1 : -1,
    }))

    const left = p.margin
    const top = p.margin
    const spanX = width - p.margin * 2
    const spanY = height - p.margin * 2
    const cx = left + spanX / 2
    const cy = top + spanY / 2
    const unit = Math.min(spanX, spanY)
    const spin = (p.spin * Math.PI) / 180

    const lenses = []
    for (let i = 0; i < p.lenses; i += 1) {
      const s = seeds[i]
      const a = s.angle + spin
      lenses.push({
        x: cx + Math.cos(a) * s.distance * p.orbit * unit,
        y: cy + Math.sin(a) * s.distance * p.orbit * unit,
        r: s.size * p.reach * unit * 0.5,
        k: s.sign * p.strength,
      })
    }

    /**
     * Push a point through every lens.
     *
     * Falloff is smooth and reaches zero at the rim, so a lens has no edge of
     * its own — otherwise the grid would show a visible circle where the
     * distortion stops, and the illusion depends on not seeing one.
     */
    const bend = (x, y) => {
      let px = x
      let py = y
      for (const lens of lenses) {
        const dx = px - lens.x
        const dy = py - lens.y
        const d = Math.hypot(dx, dy)
        if (d >= lens.r || d < 1e-6) continue
        const t = 1 - d / lens.r
        const falloff = t * t * (3 - 2 * t)

        // Scale the distance rather than adding to it. Adding a constant push
        // leaves points at the very centre displaced in an arbitrary
        // direction while the centre itself stays put, which tore spikes into
        // the lattice. Scaling sends the displacement to zero at the centre
        // and at the rim alike, so the lens has no discontinuity anywhere.
        const magnify = Math.max(0.05, 1 + lens.k * falloff)

        const twist = p.twist * falloff * 1.2
        const ca = Math.cos(twist)
        const sa = Math.sin(twist)
        const rx = (dx * ca - dy * sa) / d
        const ry = (dx * sa + dy * ca) / d
        px = lens.x + rx * d * magnify
        py = lens.y + ry * d * magnify
      }
      return [px, py]
    }

    const n = p.grid
    const cellW = spanX / n
    const cellH = spanY / n

    // Every lattice vertex, bent once and reused by the four cells around it,
    // so neighbouring cells share edges exactly and no seams open.
    const verts = new Float64Array((n + 1) * (n + 1) * 2)
    for (let j = 0; j <= n; j += 1) {
      for (let i = 0; i <= n; i += 1) {
        const [bx, by] = bend(left + i * cellW, top + j * cellH)
        const at = (j * (n + 1) + i) * 2
        verts[at] = bx
        verts[at + 1] = by
      }
    }
    const vx = (i, j) => verts[(j * (n + 1) + i) * 2]
    const vy = (i, j) => verts[(j * (n + 1) + i) * 2 + 1]

    const buckets = inks.map(() => [])

    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        let corners = [
          [vx(i, j), vy(i, j)],
          [vx(i + 1, j), vy(i + 1, j)],
          [vx(i + 1, j + 1), vy(i + 1, j + 1)],
          [vx(i, j + 1), vy(i, j + 1)],
        ]

        if (p.inset > 0) {
          const mx = (corners[0][0] + corners[1][0] + corners[2][0] + corners[3][0]) / 4
          const my = (corners[0][1] + corners[1][1] + corners[2][1] + corners[3][1]) / 4
          corners = corners.map(([x, y]) => [x + (mx - x) * p.inset, y + (my - y) * p.inset])
        }

        let ink
        if (p.fill === 'rings') {
          // Distance from the middle in grid space, so the banding follows the
          // lattice rather than the distorted result.
          const ring = Math.hypot(i - (n - 1) / 2, j - (n - 1) / 2)
          ink = Math.round(ring) % inks.length
        } else if (p.fill === 'none') {
          ink = 0
        } else {
          ink = (i + j) % 2 === 0 ? 0 : 1 % inks.length
        }

        const d =
          `M${r1(corners[0][0])},${r1(corners[0][1])}` +
          corners.slice(1).map(([x, y]) => `L${r1(x)},${r1(y)}`).join('') +
          'Z'

        buckets[ink].push({ tag: 'path', attrs: { d } })
      }
    }

    // Every group is emitted even when empty, so cells moving between inks
    // can't change the node count and flicker under animation.
    const shapes = buckets.map((children, i) => {
      const attrs =
        p.fill === 'none'
          ? { fill: 'none', stroke: inks[i], 'stroke-width': Math.max(0.3, p.edge || 1) }
          : { fill: inks[i] }
      if (p.fill !== 'none' && p.edge > 0) {
        attrs.stroke = palette.bg
        attrs['stroke-width'] = p.edge
        attrs['stroke-linejoin'] = 'round'
      }
      return { tag: 'g', attrs, children }
    })

    return { width, height, background: palette.bg, shapes }
  },
}
