import { createNoise2D, fbm } from '../core/noise.js'
import { getPalette, paletteOptions } from '../core/palettes.js'

/**
 * Contour.
 *
 * Iso-lines through a noise field, found by marching squares: every line traces
 * one constant height, so they nest inside one another and never cross. That
 * nesting is what makes it read as a map rather than as a drawing — the other
 * line pieces here have open curves that tangle.
 *
 * Built for showcase: the levels are fixed, so sliding the field underneath
 * them makes the whole map flow while the number of lines stays put.
 */

const params = [
  { key: 'levels', type: 'range', label: 'Levels', min: 2, max: 30, step: 1, default: 14, structural: true },
  { key: 'resolution', type: 'range', label: 'Resolution', min: 20, max: 160, step: 2, default: 90, structural: true },
  { key: 'fieldScale', type: 'range', label: 'Field scale', min: 0.2, max: 4, step: 0.02, default: 1.15 },
  { key: 'detail', type: 'range', label: 'Detail', min: 1, max: 5, step: 1, default: 3 },
  { key: 'phase', type: 'range', label: 'Phase', min: 0, max: 20, step: 0.01, default: 0 },
  { key: 'depth', type: 'range', label: 'Depth', min: 0, max: 2, step: 0.01, default: 0 },
  { key: 'range', type: 'range', label: 'Range', min: 0.2, max: 1, step: 0.005, default: 0.85 },
  { key: 'lineWidth', type: 'range', label: 'Line width', min: 0.2, max: 6, step: 0.05, default: 1.2 },
  { key: 'opacity', type: 'range', label: 'Opacity', min: 0.1, max: 1, step: 0.01, default: 0.9 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 30 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'jade' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.6 },
]

const r1 = (n) => Math.round(n * 10) / 10

/** Where along an edge the field crosses `level`. */
const cross = (a, b, level) => (Math.abs(b - a) < 1e-9 ? 0.5 : (level - a) / (b - a))

export default {
  id: 'contour',
  name: 'Contour',
  blurb: 'Iso-lines through a field. They nest, and never cross.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = [...palette.colors].reverse()
    const noise = createNoise2D(rng)
    // Spent up front so a seed shifts the field rather than the line count.
    const drift = rng.range(0, 40)

    const left = p.margin
    const top = p.margin
    const spanX = width - p.margin * 2
    const spanY = height - p.margin * 2
    const unit = Math.sqrt(width * height)

    const res = p.resolution
    const stepX = spanX / res
    const stepY = spanY / res

    // Sample once; every level reads the same grid.
    const field = new Float64Array((res + 1) * (res + 1))
    let lo = Infinity
    let hi = -Infinity
    for (let j = 0; j <= res; j += 1) {
      for (let i = 0; i <= res; i += 1) {
        const x = left + i * stepX
        const y = top + j * stepY
        const v = fbm(
          noise,
          (x / unit) * p.fieldScale + p.phase + drift,
          (y / unit) * p.fieldScale + drift,
          p.detail,
        )
        field[j * (res + 1) + i] = v
        if (v < lo) lo = v
        if (v > hi) hi = v
      }
    }

    // Levels are placed inside the field's *measured* range, not a fixed one.
    // Stacking octaves shrinks fBm's output well inside [-1, 1], so fixed
    // levels miss it entirely and draw nothing — at two levels, that was a
    // blank canvas.
    const mid = (lo + hi) / 2
    const half = Math.max(1e-6, (hi - lo) / 2)

    const shapes = []

    for (let l = 0; l < p.levels; l += 1) {
      // Levels spread over the middle `range` of the field, so the outermost
      // ones still close rather than running off the edge.
      // Inset from the extremes so the outermost lines still close.
      const t = p.levels === 1 ? 0.5 : (l + 0.5) / p.levels
      const level = mid + (t - 0.5) * 2 * half * p.range + p.depth * half * 0.4 * Math.sin(t * Math.PI)

      let d = ''
      for (let j = 0; j < res; j += 1) {
        for (let i = 0; i < res; i += 1) {
          const tl = field[j * (res + 1) + i]
          const tr = field[j * (res + 1) + i + 1]
          const br = field[(j + 1) * (res + 1) + i + 1]
          const bl = field[(j + 1) * (res + 1) + i]

          // Marching squares: one bit per corner above the level.
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
            // Saddles: the field passes the level twice in one cell. Drawing
            // both crossings keeps the line closed rather than leaving a gap.
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
          stroke: inks[Math.min(inks.length - 1, Math.floor(t * inks.length))],
          'stroke-width': p.lineWidth,
          'stroke-opacity': p.opacity,
          'stroke-linecap': 'round',
        },
      })
    }

    return { width, height, background: palette.bg, shapes }
  },
}
