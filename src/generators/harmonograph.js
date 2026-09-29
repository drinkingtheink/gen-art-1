import { getPalette, paletteOptions } from '../core/palettes.js'
import { createPathBuilder } from '../core/simplify.js'

/**
 * Harmonograph.
 *
 * The Victorian drawing machine: pens on decaying pendulums, tracing the sum
 * of a few sine waves per axis. Near-integer frequency ratios close into
 * standing figures; detune them slightly and the figure precesses instead of
 * closing, which is where the motion comes from.
 *
 * Built for showcase like moiré: the rng is spent up front choosing each
 * pendulum's ratio, phase and decay. Every param after that scales or offsets
 * those fixed numbers, so the curve morphs continuously rather than being
 * redrawn.
 */

const params = [
  { key: 'curves', type: 'range', label: 'Curves', min: 1, max: 14, step: 1, default: 5, structural: true },
  { key: 'resolution', type: 'range', label: 'Resolution', min: 400, max: 5000, step: 100, default: 2400, structural: true },
  { key: 'pendulums', type: 'range', label: 'Pendulums', min: 2, max: 4, step: 1, default: 3, structural: true },
  { key: 'spanTurns', type: 'range', label: 'Length', min: 2, max: 40, step: 0.1, default: 9 },
  { key: 'detune', type: 'range', label: 'Detune', min: 0, max: 0.12, step: 0.0005, default: 0.006 },
  { key: 'drift', type: 'range', label: 'Phase drift', min: 0, max: 6.3, step: 0.01, default: 0 },
  // Heavy damping winds the pendulum down to a dot before the curve is drawn,
  // and amplitude is the size of the figure — both are ways for a random roll
  // to produce an empty page.
  { key: 'damping', type: 'range', label: 'Damping', min: 0, max: 1.6, step: 0.005, default: 0.2, wander: 0.35 },
  { key: 'amplitude', type: 'range', label: 'Size', min: 0.1, max: 1, step: 0.005, default: 0.86, wander: 0.5 },
  { key: 'separation', type: 'range', label: 'Separation', min: 0, max: 120, step: 0.5, default: 0 },
  { key: 'lineWidth', type: 'range', label: 'Line width', min: 0.2, max: 5, step: 0.05, default: 1.1 },
  { key: 'opacity', type: 'range', label: 'Opacity', min: 0.1, max: 1, step: 0.01, default: 0.85 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 60 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'harbor' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.15 },
]

const r1 = (n) => Math.round(n * 10) / 10

/**
 * Sampling has to keep up with the fastest pendulum, not the curve as a whole.
 * At `spanTurns` 14 with ratios up to 5, 700 samples gives the quickest
 * component barely 0.6 radians per step and the curve comes out as an angular
 * scribble rather than a rosette. Sampling dense is cheap here because the
 * simplifier discards whatever the curve didn't actually bend through.
 */
const MAX_CURVES = 14
const MAX_PENDULUMS = 4

export default {
  id: 'harmonograph',
  name: 'Harmonograph',
  blurb: 'Pens on decaying pendulums. Detune them and the figure never closes.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = [...palette.colors].reverse()

    // Everything random is decided here, for the maximum curve and pendulum
    // count, so changing either doesn't shift the sequence for the ones that
    // remain — the figure grows or sheds curves instead of being replaced.
    // Stepping through the ink list rather than drawing independently, so a
    // stack of curves can't all land on the same colour by chance — which is
    // likely when the weighting favours the front of the list.
    const inkOrder = rng.int(0, inks.length - 1)
    const curveSeeds = Array.from({ length: MAX_CURVES }, (_, index) => ({
      ink: inks[(inkOrder + index) % inks.length],
      // Small whole-number ratios are what make the figure close on itself.
      arms: Array.from({ length: MAX_PENDULUMS }, (_, i) => ({
        ratio: rng.int(1, 5) + (i === 0 ? 0 : rng.int(0, 1)),
        phase: rng.float() * Math.PI * 2,
        decay: rng.range(0.4, 1.2),
        weight: rng.range(0.45, 1),
        skew: rng.range(-1, 1),
      })),
      lean: rng.range(-1, 1),
    }))

    const left = p.margin
    const top = p.margin
    const cx = width / 2
    const cy = height / 2
    const reach = (Math.min(width - left * 2, height - top * 2) / 2) * p.amplitude

    const shapes = []

    for (let c = 0; c < p.curves; c += 1) {
      const seed = curveSeeds[c]
      const arms = seed.arms.slice(0, p.pendulums)

      // Each curve is nudged a little further out of tune than the last, so a
      // stack of them fans out instead of overlapping exactly.
      const detune = p.detune * (c + 1)
      const phaseShift = p.drift * (1 + seed.lean * 0.3)
      const offsetX = seed.lean * p.separation
      const offsetY = -seed.lean * p.separation * 0.6

      let path = null

      for (let s = 0; s <= p.resolution; s += 1) {
        const u = s / p.resolution
        const t = u * p.spanTurns * Math.PI * 2
        const envelope = Math.exp(-u * p.damping * 3)

        let x = 0
        let y = 0
        let total = 0
        for (let a = 0; a < arms.length; a += 1) {
          const arm = arms[a]
          const freq = arm.ratio + detune * (a + 1)
          const decay = Math.exp(-u * p.damping * arm.decay * 3)
          x += Math.cos(freq * t + arm.phase + phaseShift) * arm.weight * decay
          y += Math.sin(freq * t * (1 + arm.skew * detune) + arm.phase * 1.3 - phaseShift) * arm.weight * decay
          total += arm.weight
        }

        const px = cx + offsetX + (x / total) * reach * envelope
        const py = cy + offsetY + (y / total) * reach * envelope

        if (!path) path = createPathBuilder(px, py, 0.4, r1)
        else path.push(px, py)
      }

      if (!path) continue
      const { d, points } = path.finish()
      if (points < 2) continue

      shapes.push({
        tag: 'path',
        attrs: {
          d,
          fill: 'none',
          stroke: seed.ink,
          'stroke-width': p.lineWidth,
          'stroke-opacity': p.opacity,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        },
      })
    }

    return { width, height, background: palette.bg, shapes }
  },
}
