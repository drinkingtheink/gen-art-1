import { getPalette, paletteOptions } from '@/core/palettes.js'

/**
 * Rosette.
 *
 * One motif, repeated around a centre and mirrored. Every other piece here is
 * either an allover field with no particular orientation or a single figure;
 * this one is built on rotational symmetry, so it has a middle, and the eye
 * goes there and stays.
 *
 * Built for showcase: the symmetry and ring count are structural, but spin,
 * twist and petal shape all move continuously — and because every ring turns
 * at its own rate, the figure never repeats itself even while staying
 * perfectly symmetric.
 */

const params = [
  { key: 'segments', type: 'range', label: 'Symmetry', min: 3, max: 24, step: 1, default: 9, structural: true },
  { key: 'rings', type: 'range', label: 'Rings', min: 1, max: 9, step: 1, default: 5, structural: true },
  { key: 'mirror', type: 'toggle', label: 'Mirror', default: true },
  { key: 'spin', type: 'range', label: 'Spin', min: 0, max: 360, step: 0.2, default: 0 },
  { key: 'twist', type: 'range', label: 'Twist', min: -60, max: 60, step: 0.2, default: 14 },
  { key: 'inner', type: 'range', label: 'Inner radius', min: 0, max: 0.5, step: 0.005, default: 0.08 },
  { key: 'reach', type: 'range', label: 'Reach', min: 0.3, max: 1.05, step: 0.005, default: 0.86 },
  { key: 'petal', type: 'range', label: 'Petal width', min: 0.05, max: 1.4, step: 0.005, default: 0.62 },
  { key: 'bow', type: 'range', label: 'Bow', min: -1.2, max: 1.2, step: 0.005, default: 0.45 },
  { key: 'taper', type: 'range', label: 'Taper', min: 0.2, max: 1.6, step: 0.005, default: 0.85 },
  { key: 'lineWidth', type: 'range', label: 'Line width', min: 0, max: 6, step: 0.05, default: 1.2 },
  { key: 'opacity', type: 'range', label: 'Opacity', min: 0.1, max: 1, step: 0.01, default: 0.9 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 50 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'plasma' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.5 },
]

const r1 = (n) => Math.round(n * 10) / 10

export default {
  id: 'rosette',
  name: 'Rosette',
  blurb: 'One motif, turned about a centre. It has a middle, and you look at it.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = [...palette.colors].reverse()

    // Spent up front, for the maximum ring count, so changing `rings` doesn't
    // recolour or reshape the ones that remain.
    const ringSeeds = Array.from({ length: 9 }, (_, i) => ({
      ink: inks[i % inks.length],
      lean: rng.range(-1, 1),
      swell: rng.range(0.7, 1.3),
      rate: rng.range(0.5, 1.6) * (rng.bool() ? 1 : -1),
    }))

    const cx = width / 2
    const cy = height / 2
    const radius = (Math.min(width, height) / 2 - p.margin) * p.reach
    const inner = radius * p.inner
    const spin = (p.spin * Math.PI) / 180
    const twist = (p.twist * Math.PI) / 180
    const step = (Math.PI * 2) / p.segments

    const shapes = []

    for (let r = 0; r < p.rings; r += 1) {
      const seed = ringSeeds[r]
      const t0 = p.rings === 1 ? 0 : r / p.rings
      const t1 = p.rings === 1 ? 1 : (r + 1) / p.rings

      const near = inner + (radius - inner) * t0
      const far = inner + (radius - inner) * Math.min(1, t1 * p.taper + t0 * (1 - p.taper) + 0.12)

      // Each ring turns at its own rate, so the figure keeps reorganising
      // without ever losing its symmetry.
      const offset = spin * seed.rate + twist * r

      const children = []
      for (let s = 0; s < p.segments; s += 1) {
        const mid = s * step + offset
        const half = step * 0.5 * p.petal * seed.swell

        // A petal: out along one edge, back along the other, each edge bowed
        // away from the radius by `bow`.
        const build = (sign) => {
          const a0 = mid - half * sign
          const a1 = mid + half * sign
          const bowAngle = p.bow * half * (1 + seed.lean * 0.3)
          const ax = cx + Math.cos(a0) * near
          const ay = cy + Math.sin(a0) * near
          const bx = cx + Math.cos(mid) * far
          const by = cy + Math.sin(mid) * far
          const cxx = cx + Math.cos(a1) * near
          const cyy = cy + Math.sin(a1) * near
          const q1x = cx + Math.cos(mid - bowAngle) * ((near + far) / 2)
          const q1y = cy + Math.sin(mid - bowAngle) * ((near + far) / 2)
          const q2x = cx + Math.cos(mid + bowAngle) * ((near + far) / 2)
          const q2y = cy + Math.sin(mid + bowAngle) * ((near + far) / 2)
          return (
            `M${r1(ax)},${r1(ay)}` +
            `Q${r1(q1x)},${r1(q1y)} ${r1(bx)},${r1(by)}` +
            `Q${r1(q2x)},${r1(q2y)} ${r1(cxx)},${r1(cyy)}` +
            (p.lineWidth > 0 ? '' : 'Z')
          )
        }

        children.push({ tag: 'path', attrs: { d: build(1) } })
        if (p.mirror) children.push({ tag: 'path', attrs: { d: build(-1) } })
      }

      shapes.push({
        tag: 'g',
        attrs:
          p.lineWidth > 0
            ? {
                fill: 'none',
                stroke: seed.ink,
                'stroke-width': p.lineWidth,
                'stroke-opacity': p.opacity,
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
              }
            : { fill: seed.ink, 'fill-opacity': p.opacity },
        children,
      })
    }

    return { width, height, background: palette.bg, shapes }
  },
}
