import { getPalette, paletteOptions } from '../core/palettes.js'

/**
 * Chladni figures.
 *
 * The lines a vibrating plate holds still. Sand thrown onto a bowed metal plate
 * gathers where the plate isn't moving, tracing the nodes of the standing wave;
 * these are those nodal lines, found where a sum of vibration modes crosses
 * zero.
 *
 * Every other field piece here is built on noise and so is irregular by
 * nature. This one is built on cosines, so it comes out rigidly symmetric — a
 * structure, not a landscape.
 *
 * Built for showcase: the mode numbers are real numbers rather than the
 * integers physics would require. Whole numbers give the figures a plate can
 * actually hold; sliding between them morphs one standing wave into the next.
 */

const params = [
  { key: 'terms', type: 'range', label: 'Modes', min: 1, max: 5, step: 1, default: 3, structural: true },
  { key: 'resolution', type: 'range', label: 'Resolution', min: 30, max: 180, step: 2, default: 110, structural: true },
  { key: 'levels', type: 'range', label: 'Bands', min: 1, max: 14, step: 1, default: 5, structural: true },
  { key: 'modeA', type: 'range', label: 'Mode A', min: 1, max: 14, step: 0.005, default: 6 },
  { key: 'modeB', type: 'range', label: 'Mode B', min: 1, max: 14, step: 0.005, default: 9.5 },
  { key: 'detune', type: 'range', label: 'Detune', min: 0, max: 2, step: 0.002, default: 0.2 },
  { key: 'mix', type: 'range', label: 'Mode mix', min: 0, max: 1, step: 0.005, default: 0.6 },
  { key: 'spread', type: 'range', label: 'Band spread', min: 0.02, max: 1, step: 0.005, default: 0.22 },
  { key: 'squash', type: 'range', label: 'Squash', min: 0.4, max: 1.6, step: 0.005, default: 1 },
  { key: 'lineWidth', type: 'range', label: 'Line width', min: 0.2, max: 6, step: 0.05, default: 1.4 },
  { key: 'opacity', type: 'range', label: 'Opacity', min: 0.1, max: 1, step: 0.01, default: 0.9 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 40 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'electric' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.6 },
]

const r1 = (n) => Math.round(n * 10) / 10
const cross = (a, b, level) => (Math.abs(b - a) < 1e-9 ? 0.5 : (level - a) / (b - a))

export default {
  id: 'chladni',
  name: 'Chladni',
  blurb: 'The lines a vibrating plate holds still.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = [...palette.colors].reverse()

    // Spent up front, for the maximum term count, so changing `terms` doesn't
    // rebuild the modes that remain.
    const modes = Array.from({ length: 5 }, (_, i) => ({
      offsetA: rng.range(-2, 2),
      offsetB: rng.range(-2, 2),
      weight: rng.range(0.35, 1) / (i + 1),
      flip: rng.bool() ? 1 : -1,
    }))

    const left = p.margin
    const top = p.margin
    const spanX = width - p.margin * 2
    const spanY = height - p.margin * 2
    const res = p.resolution
    const stepX = spanX / res
    const stepY = spanY / res

    /**
     * The plate's displacement. Each term is the classic
     * cos(a x)cos(b y) - cos(b x)cos(a y), which is antisymmetric across the
     * diagonal and so vanishes along it — the reason these figures are
     * symmetric rather than merely busy.
     */
    const plate = (u, v) => {
      const y = (v - 0.5) / p.squash + 0.5
      let sum = 0
      let norm = 0
      for (let k = 0; k < p.terms; k += 1) {
        const mode = modes[k]
        const a = (p.modeA + mode.offsetA * p.detune) * Math.PI
        const b = (p.modeB + mode.offsetB * p.detune) * Math.PI
        const first = Math.cos(a * u) * Math.cos(b * y)
        const second = Math.cos(b * u) * Math.cos(a * y)
        sum += mode.weight * mode.flip * (first - p.mix * second)
        norm += mode.weight
      }
      return sum / Math.max(0.001, norm)
    }

    const field = new Float64Array((res + 1) * (res + 1))
    let lo = Infinity
    let hi = -Infinity
    for (let j = 0; j <= res; j += 1) {
      for (let i = 0; i <= res; i += 1) {
        const v = plate(i / res, j / res)
        field[j * (res + 1) + i] = v
        if (v < lo) lo = v
        if (v > hi) hi = v
      }
    }
    const half = Math.max(1e-6, Math.max(Math.abs(lo), Math.abs(hi)))

    const shapes = []

    for (let l = 0; l < p.levels; l += 1) {
      // Level 0 is the nodal line itself — where the plate is still. The rest
      // are bands either side of it, which read as the plate's motion.
      const step = p.levels === 1 ? 0 : l / (p.levels - 1)
      const level = step * p.spread * half * (l % 2 === 0 ? 1 : -1)

      let d = ''
      for (let j = 0; j < res; j += 1) {
        for (let i = 0; i < res; i += 1) {
          const tl = field[j * (res + 1) + i]
          const tr = field[j * (res + 1) + i + 1]
          const br = field[(j + 1) * (res + 1) + i + 1]
          const bl = field[(j + 1) * (res + 1) + i]
          const code = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0)
          if (code === 0 || code === 15) continue

          const x = left + i * stepX
          const y = top + j * stepY
          const N = () => [x + cross(tl, tr, level) * stepX, y]
          const E = () => [x + stepX, y + cross(tr, br, level) * stepY]
          const S = () => [x + cross(bl, br, level) * stepX, y + stepY]
          const W = () => [x, y + cross(tl, bl, level) * stepY]

          let pair = null
          switch (code) {
            case 1: case 14: pair = [W(), S()]; break
            case 2: case 13: pair = [S(), E()]; break
            case 3: case 12: pair = [W(), E()]; break
            case 4: case 11: pair = [N(), E()]; break
            case 6: case 9: pair = [N(), S()]; break
            case 7: case 8: pair = [W(), N()]; break
            case 5: d += `M${r1(W()[0])},${r1(W()[1])}L${r1(N()[0])},${r1(N()[1])}M${r1(S()[0])},${r1(S()[1])}L${r1(E()[0])},${r1(E()[1])}`; break
            case 10: d += `M${r1(N()[0])},${r1(N()[1])}L${r1(E()[0])},${r1(E()[1])}M${r1(W()[0])},${r1(W()[1])}L${r1(S()[0])},${r1(S()[1])}`; break
            default: break
          }
          if (pair) d += `M${r1(pair[0][0])},${r1(pair[0][1])}L${r1(pair[1][0])},${r1(pair[1][1])}`
        }
      }

      if (!d) continue
      shapes.push({
        tag: 'path',
        attrs: {
          d,
          fill: 'none',
          stroke: inks[Math.min(inks.length - 1, Math.floor(step * inks.length))],
          // The nodal line reads strongest; the bands sit behind it.
          'stroke-width': r1(l === 0 ? p.lineWidth : p.lineWidth * 0.55),
          'stroke-opacity': l === 0 ? p.opacity : p.opacity * 0.6,
          'stroke-linecap': 'round',
        },
      })
    }

    return { width, height, background: palette.bg, shapes }
  },
}
