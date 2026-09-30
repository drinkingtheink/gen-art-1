import { getPalette, paletteOptions } from '../core/palettes.js'

/**
 * Phyllotaxis.
 *
 * The arrangement a sunflower head uses: each seed placed one fixed turn
 * further round than the last, at a radius growing as the square root of its
 * index. At the golden angle — 137.507° — no two seeds ever line up, which is
 * why the head packs so tightly and why the spiral arms you see are an
 * illusion of the eye grouping neighbours.
 *
 * Built for showcase, and it's the best subject here for it: the divergence
 * angle is the whole piece, it's continuous, and a hundredth of a degree
 * reorganises every visible arm while every seed keeps its place in the
 * sequence.
 */

const params = [
  // Too few seeds, or seeds too small, and the spiral stops being one — a
  // random roll stays where the pattern still reads.
  { key: 'seeds', type: 'range', label: 'Seeds', min: 50, max: 2600, step: 10, default: 900, structural: true, wander: 0.5 },
  // The golden angle, and the reason the spiral packs at all. A couple of
  // degrees either side still reads as phyllotaxis; five degrees is a handful
  // of spokes with gaps between them, so a random roll stays close.
  { key: 'divergence', type: 'range', label: 'Divergence', min: 130, max: 145, step: 0.001, default: 137.507, wander: 0.25 },
  { key: 'spread', type: 'range', label: 'Spread', min: 0.4, max: 1.4, step: 0.005, default: 1 },
  { key: 'packing', type: 'range', label: 'Packing', min: 0.3, max: 0.9, step: 0.005, default: 0.5 },
  { key: 'dotSize', type: 'range', label: 'Seed size', min: 0.1, max: 3, step: 0.01, default: 1.05, wander: 0.45 },
  { key: 'grow', type: 'range', label: 'Growth', min: -1, max: 1.5, step: 0.005, default: 0.4, wander: 0.5 },
  { key: 'shape', type: 'select', label: 'Seed shape', options: [
    { value: 'circle', label: 'Round' },
    { value: 'petal', label: 'Petal' },
    { value: 'bar', label: 'Bar' },
  ], default: 'circle' },
  { key: 'turn', type: 'range', label: 'Turn', min: 0, max: 360, step: 0.2, default: 0 },
  { key: 'hollow', type: 'range', label: 'Hollow', min: 0, max: 0.6, step: 0.005, default: 0, wander: 0.5 },
  { key: 'opacity', type: 'range', label: 'Opacity', min: 0.1, max: 1, step: 0.01, default: 0.95, wander: 0.5 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 40 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'marigold' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.5 },
]

const r1 = (n) => Math.round(n * 10) / 10

export default {
  id: 'phyllotaxis',
  name: 'Phyllotaxis',
  blurb: 'The spirals are your eye, not the rule.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = [...palette.colors].reverse()
    // Only the ink banding is random; the arrangement is entirely the rule.
    const inkOffset = rng.int(0, inks.length - 1)
    const bandRate = rng.range(0.6, 1.8)

    const cx = width / 2
    const cy = height / 2
    const radius = Math.min(width, height) / 2 - p.margin
    const step = (p.divergence * Math.PI) / 180
    const turn = (p.turn * Math.PI) / 180

    // Radius as index^packing: 0.5 is the botanical case and packs evenly;
    // higher crowds the centre, lower crowds the rim.
    const scale = (radius * p.spread) / Math.pow(Math.max(1, p.seeds), p.packing)
    const hollow = radius * p.hollow

    const buckets = inks.map(() => [])

    for (let i = 0; i < p.seeds; i += 1) {
      const angle = i * step + turn
      const r = hollow + scale * Math.pow(i, p.packing)
      if (r > radius) break

      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r

      // Seeds grow or shrink with distance out, the way a real head does.
      const t = i / Math.max(1, p.seeds)
      const size = Math.max(0.05, p.dotSize * scale * 0.8 * (1 + p.grow * t))

      const band = Math.floor(t * inks.length * bandRate + inkOffset) % inks.length
      const bucket = buckets[(band + inks.length) % inks.length]

      if (p.shape === 'bar') {
        const dx = Math.cos(angle) * size
        const dy = Math.sin(angle) * size
        bucket.push({
          tag: 'path',
          attrs: { d: `M${r1(x - dx)},${r1(y - dy)}L${r1(x + dx)},${r1(y + dy)}` },
        })
      } else if (p.shape === 'petal') {
        // A lens, pointing outward along the radius.
        const dx = Math.cos(angle) * size * 1.6
        const dy = Math.sin(angle) * size * 1.6
        const px = -Math.sin(angle) * size * 0.7
        const py = Math.cos(angle) * size * 0.7
        bucket.push({
          tag: 'path',
          attrs: {
            d:
              `M${r1(x - dx)},${r1(y - dy)}` +
              `Q${r1(x + px)},${r1(y + py)} ${r1(x + dx)},${r1(y + dy)}` +
              `Q${r1(x - px)},${r1(y - py)} ${r1(x - dx)},${r1(y - dy)}Z`,
          },
        })
      } else {
        bucket.push({ tag: 'circle', attrs: { cx: r1(x), cy: r1(y), r: r1(size) } })
      }
    }

    // Groups always emitted, so a seed changing band can't change the count.
    const shapes = buckets.map((children, i) => ({
      tag: 'g',
      attrs:
        p.shape === 'bar'
          ? {
              fill: 'none',
              stroke: inks[i],
              'stroke-width': r1(Math.max(0.3, p.dotSize * 1.4)),
              'stroke-opacity': p.opacity,
              'stroke-linecap': 'round',
            }
          : { fill: inks[i], 'fill-opacity': p.opacity },
      children,
    }))

    return { width, height, background: palette.bg, shapes }
  },
}
