import { getPalette, legibleInks, paletteOptions } from '../core/palettes.js'

/**
 * Rosette.
 *
 * One motif, repeated around a centre and mirrored. Every other piece here is
 * either an allover field with no particular orientation or a single figure;
 * this one is built on rotational symmetry, so it has a middle, and the eye
 * goes there and stays.
 *
 * The thing that makes a real rosette — a cathedral window, a mandala, a coin
 * die — worth staring at is not the symmetry, which is free, but that the
 * bands disagree. Different motifs at different scales, some solid and some
 * drawn, separated by rims, resolving into a medallion at the centre. Turning
 * a single lens shape at five radii gives you symmetry and nothing to look at,
 * which is what this piece used to be.
 *
 * So each band picks its own motif — petals, star chords, scallops, beads,
 * needles — its own weight, and whether it is filled or drawn, and every motif
 * can nest copies of itself inside itself, which is what tracery does and the
 * cheapest detail in the piece.
 *
 * Built for showcase: symmetry, ring count and nesting are structural, but
 * spin, twist, petal shape, bow, rim and core all move continuously — and
 * because every ring turns at its own rate, the figure never repeats itself
 * even while staying perfectly symmetric.
 */

const params = [
  { key: 'segments', type: 'range', label: 'Symmetry', min: 3, max: 24, step: 1, default: 12, structural: true },
  { key: 'rings', type: 'range', label: 'Rings', min: 1, max: 9, step: 1, default: 6, structural: true, wander: 0.5 },
  { key: 'motif', type: 'select', label: 'Motif', options: [
    { value: 'mixed', label: 'Mixed bands' },
    { value: 'petal', label: 'Petals' },
    { value: 'star', label: 'Star chords' },
    { value: 'scallop', label: 'Scallops' },
    { value: 'beads', label: 'Beads' },
    { value: 'needle', label: 'Needles' },
  ], default: 'mixed' },
  // Nesting changes how many shapes a band draws, so it can't be animated —
  // but it costs nothing and it is where most of the detail comes from.
  { key: 'nest', type: 'range', label: 'Nesting', min: 1, max: 4, step: 1, default: 3, structural: true, wander: 0.6 },
  { key: 'mirror', type: 'toggle', label: 'Mirror', default: true },
  { key: 'spin', type: 'range', label: 'Spin', min: 0, max: 360, step: 0.2, default: 0 },
  { key: 'twist', type: 'range', label: 'Twist', min: -60, max: 60, step: 0.2, default: 14 },
  { key: 'inner', type: 'range', label: 'Inner radius', min: 0, max: 0.5, step: 0.005, default: 0.16, wander: 0.5 },
  // Reach and petal width between them decide how much of the canvas the
  // figure covers, and a line width of zero draws nothing at all — so a random
  // roll keeps all three near where the piece was authored.
  { key: 'reach', type: 'range', label: 'Reach', min: 0.3, max: 1.05, step: 0.005, default: 0.9, wander: 0.5 },
  { key: 'petal', type: 'range', label: 'Petal width', min: 0.05, max: 1.4, step: 0.005, default: 0.78, wander: 0.4 },
  { key: 'bow', type: 'range', label: 'Bow', min: -1.2, max: 1.2, step: 0.005, default: 0.45 },
  { key: 'taper', type: 'range', label: 'Taper', min: 0.2, max: 1.6, step: 0.005, default: 0.85, wander: 0.5 },
  { key: 'fillMix', type: 'range', label: 'Solid bands', min: 0, max: 1, step: 0.01, default: 0.4, wander: 0.6 },
  { key: 'rim', type: 'range', label: 'Rims', min: 0, max: 5, step: 0.05, default: 1, wander: 0.45 },
  { key: 'core', type: 'range', label: 'Medallion', min: 0, max: 1, step: 0.005, default: 0.6 },
  { key: 'lineWidth', type: 'range', label: 'Line width', min: 0, max: 6, step: 0.05, default: 1.6, wander: 0.25 },
  { key: 'opacity', type: 'range', label: 'Opacity', min: 0.1, max: 1, step: 0.01, default: 0.95, wander: 0.5 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 50 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'plasma' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.5 },
]

const r1 = (n) => Math.round(n * 10) / 10

const KINDS = ['petal', 'star', 'scallop', 'beads', 'needle']

/** Seeds are spent for the largest ring count, so `rings` only ever truncates. */
const MAX_RINGS = 9

export default {
  id: 'rosette',
  name: 'Rosette',
  blurb: 'One motif, turned about a centre. It has a middle, and you look at it.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)

    // Bands are drawn from the inks that separate from the paper, loudest
    // first, so the middle of the figure is the strongest.
    const inks = legibleInks(palette).slice().reverse()

    // Every random draw happens here, up front, in a fixed quantity — nine
    // rings whether nine are drawn or one. Nothing downstream touches the rng,
    // so no param can reshuffle the figure by changing how much of it is
    // consumed, which is what lets the continuous ones be animated.
    const deal = { start: rng.int(0, KINDS.length - 1), stride: rng.pick([1, 2, 3, 4]) }

    const ringSeeds = Array.from({ length: MAX_RINGS }, (_, i) => ({
      ink: inks[i % inks.length],
      // Colour bias decides how often a band's alternate segments reach for a
      // loud ink rather than a quiet one.
      accent: rng.weighted(inks, p.colorBias),
      alternate: rng.bool(0.45),
      lean: rng.range(-1, 1),
      swell: rng.range(0.7, 1.3),
      rate: rng.range(0.5, 1.6) * (rng.bool() ? 1 : -1),
      // Dealt from a rotating deck rather than picked independently: five
      // bands of beads is a legitimate roll of five dice and a poor rosette,
      // and what makes the form worth looking at is that its bands disagree.
      kind: KINDS[(deal.start + i * deal.stride) % KINDS.length],
      // Kept as unit values and resolved against the params at draw time, so
      // changing `segments` or `fillMix` re-reads them rather than re-rolling.
      skip: rng.float(),
      solid: rng.float(),
      weight: rng.range(0.7, 1.5),
    }))

    const cx = width / 2
    const cy = height / 2
    const radius = (Math.min(width, height) / 2 - p.margin) * p.reach
    const inner = radius * p.inner
    const spin = (p.spin * Math.PI) / 180
    const twist = (p.twist * Math.PI) / 180
    const step = (Math.PI * 2) / p.segments

    const px = (angle, r) => cx + Math.cos(angle) * r
    const py = (angle, r) => cy + Math.sin(angle) * r
    const at = (angle, r) => `${r1(px(angle, r))},${r1(py(angle, r))}`

    const shapes = []

    for (let r = 0; r < p.rings; r += 1) {
      const seed = ringSeeds[r]
      const kind = p.motif === 'mixed' ? seed.kind : p.motif
      const t0 = p.rings === 1 ? 0 : r / p.rings
      const t1 = p.rings === 1 ? 1 : (r + 1) / p.rings

      const near = inner + (radius - inner) * t0
      const far = inner + (radius - inner) * Math.min(1, t1 * p.taper + t0 * (1 - p.taper) + 0.12)
      const band = far - near
      const mid = (near + far) / 2

      // Each ring turns at its own rate, so the figure keeps reorganising
      // without ever losing its symmetry.
      const offset = spin * seed.rate + twist * r
      // Chords enclose nothing, so a solid star band would come out empty.
      const filled = kind !== 'star' && seed.solid < p.fillMix

      /**
       * One motif, drawn `nest` times inside itself.
       *
       * `k` is how far in this copy sits: 0 is the band as given, and each
       * step pulls the copy toward the band's midline and narrows it. Tracery
       * in a window arch does exactly this, and it costs one loop.
       */
      const copies = []
      for (let k = 0; k < p.nest; k += 1) {
        const pull = k * 0.28
        copies.push({
          near: near + (mid - near) * pull,
          far: far - (far - mid) * pull,
          width: 1 - k * 0.22,
        })
      }

      // Alternate segments can take a second ink, which is how a band reads as
      // patterned rather than merely repeated. Both groups are always emitted —
      // an empty one costs a tag and keeps the shape count fixed.
      const runs = [[], []]

      for (let s = 0; s < p.segments; s += 1) {
        const centre = s * step + offset
        const lane = seed.alternate && s % 2 ? 1 : 0
        const half = step * 0.5 * p.petal * seed.swell

        for (const copy of copies) {
          const hw = half * copy.width
          const inward = copy.near
          const outward = copy.far
          const middle = (inward + outward) / 2

          if (kind === 'star') {
            // Chords across the circle rather than shapes along it: connect
            // each point to the one `skip` further round and the band fills
            // with a lattice nothing had to place.
            const reach = Math.max(2, Math.floor(p.segments / 2))
            const skip = 2 + Math.floor(seed.skip * Math.max(1, reach - 1))
            runs[lane].push(`M${at(centre, outward)}L${at(centre + skip * step, outward)}`)
            continue
          }

          if (kind === 'beads') {
            const room = Math.min(step * middle * 0.5, band * 0.5)
            const size = Math.max(0.5, room * p.petal * seed.swell * copy.width)
            runs[lane].push(
              `M${r1(px(centre, middle) - size)},${r1(py(centre, middle))}` +
                `a${r1(size)},${r1(size)} 0 1 0 ${r1(size * 2)},0` +
                `a${r1(size)},${r1(size)} 0 1 0 ${r1(-size * 2)},0`,
            )
            continue
          }

          if (kind === 'scallop') {
            // A lobe hung between neighbouring points and swelling to the far
            // edge of the band — the chain of half-rounds along a cornice, or
            // the bottom of a shell. Along the midline instead, which is where
            // this started, they flatten into another concentric circle.
            const chord = 2 * inward * Math.sin(hw)
            const rise = (outward - inward) * (0.55 + Math.abs(p.bow) * 0.45)
            // The ellipse has to be at least half the chord across or the arc
            // is undrawable; beyond that the rise is what shapes the lobe.
            const swing = Math.max(chord * 0.51, rise)
            const sweep = p.bow >= 0 ? 1 : 0
            runs[lane].push(
              `M${at(centre - hw, inward)}` +
                `A${r1(chord * 0.52)},${r1(swing)} 0 0 ${sweep} ${at(centre + hw, inward)}` +
                (filled ? 'Z' : ''),
            )
            continue
          }

          const build = (sign) => {
            if (kind === 'needle') {
              // A spike out to the band's edge, with the bow throwing its tip
              // off the radius so a ring of them reads as turning.
              const skew = p.bow * hw * 0.5 * sign
              return (
                `M${at(centre - hw * 0.4 * sign, inward)}` +
                `Q${at(centre + skew, middle)} ${at(centre + skew * 0.6, outward)}` +
                `Q${at(centre + skew, middle)} ${at(centre + hw * 0.4 * sign, inward)}` +
                (filled ? 'Z' : '')
              )
            }

            // Petal: out along one edge and back along the other, each edge
            // bowed off the radius.
            const a0 = centre - hw * sign
            const a1 = centre + hw * sign
            const bowAngle = p.bow * hw * (1 + seed.lean * 0.3)
            return (
              `M${at(a0, inward)}` +
              `Q${at(centre - bowAngle, middle)} ${at(centre, outward)}` +
              `Q${at(centre + bowAngle, middle)} ${at(a1, inward)}` +
              (filled ? 'Z' : '')
            )
          }

          runs[lane].push(build(1))
          if (p.mirror) runs[lane].push(build(-1))
        }
      }

      for (const [lane, run] of runs.entries()) {
        const ink = lane && seed.alternate ? seed.accent : seed.ink
        shapes.push({
          tag: 'g',
          attrs: filled
            ? { fill: ink, 'fill-opacity': p.opacity, 'fill-rule': 'evenodd' }
            : {
                fill: 'none',
                stroke: ink,
                'stroke-width': r1(Math.max(0, p.lineWidth * seed.weight)),
                'stroke-opacity': p.opacity,
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
              },
          children: [{ tag: 'path', attrs: { d: run.join('') } }],
        })
      }

      // A rim on the band's inner edge, and on the outer edge of the last
      // ring. Always emitted, at whatever width `rim` says — including none —
      // so the shape count doesn't change as it is turned up.
      shapes.push({
        tag: 'g',
        attrs: {
          fill: 'none',
          stroke: seed.ink,
          'stroke-width': r1(p.rim),
          'stroke-opacity': p.opacity * 0.85,
        },
        children: [
          { tag: 'circle', attrs: { cx: r1(cx), cy: r1(cy), r: r1(near) } },
          ...(r === p.rings - 1 ? [{ tag: 'circle', attrs: { cx: r1(cx), cy: r1(cy), r: r1(far) } }] : []),
        ],
      })
    }

    // The medallion. Without it the rings converge on a hole, which is the one
    // place the eye was always going to end up.
    const medallion = Math.max(inner, radius * 0.1) * (0.35 + p.core * 0.75)
    const boss = ringSeeds[0]
    shapes.push({
      tag: 'g',
      attrs: { 'fill-opacity': p.opacity, 'stroke-opacity': p.opacity },
      children: [
        { tag: 'circle', attrs: { cx: r1(cx), cy: r1(cy), r: r1(medallion * 0.62), fill: boss.accent } },
        {
          tag: 'circle',
          attrs: {
            cx: r1(cx),
            cy: r1(cy),
            r: r1(medallion),
            fill: 'none',
            stroke: boss.ink,
            'stroke-width': r1(Math.max(p.rim, p.lineWidth * 0.8)),
          },
        },
        {
          tag: 'path',
          attrs: {
            fill: boss.ink,
            d: Array.from({ length: p.segments }, (_, s) => {
              const a = s * step + spin * boss.rate
              const dot = Math.max(0.4, medallion * 0.13 * p.core)
              return (
                `M${r1(px(a, medallion * 0.82) - dot)},${r1(py(a, medallion * 0.82))}` +
                `a${r1(dot)},${r1(dot)} 0 1 0 ${r1(dot * 2)},0` +
                `a${r1(dot)},${r1(dot)} 0 1 0 ${r1(-dot * 2)},0`
              )
            }).join(''),
          },
        },
      ],
    })

    return { width, height, background: palette.bg, shapes }
  },
}
