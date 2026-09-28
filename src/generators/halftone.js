import { createNoise2D, fbm } from '../core/noise.js'
import { getPalette, paletteOptions } from '../core/palettes.js'

/**
 * Halftone.
 *
 * A regular grid where only the dot size varies, driven by a noise field —
 * the trick every printed image used before screens. The grid never moves;
 * tone comes entirely from how much of each cell is filled, which is why this
 * reads as print rather than drawing.
 *
 * Built for showcase: cell positions are fixed by the grid, so sliding the
 * field through them changes every dot's size continuously while the geometry
 * count stays exactly the same.
 */

const params = [
  { key: 'grid', type: 'range', label: 'Grid', min: 6, max: 90, step: 1, default: 42, structural: true },
  { key: 'shape', type: 'select', label: 'Dot shape', options: [
    { value: 'circle', label: 'Round' },
    { value: 'square', label: 'Square' },
    { value: 'diamond', label: 'Diamond' },
  ], default: 'circle' },
  { key: 'fieldScale', type: 'range', label: 'Field scale', min: 0.2, max: 5, step: 0.02, default: 1.5 },
  { key: 'detail', type: 'range', label: 'Detail', min: 1, max: 4, step: 1, default: 2 },
  { key: 'phase', type: 'range', label: 'Phase', min: 0, max: 20, step: 0.01, default: 0 },
  { key: 'gain', type: 'range', label: 'Gain', min: 0.1, max: 2, step: 0.01, default: 1 },
  { key: 'contrast', type: 'range', label: 'Contrast', min: 0.2, max: 6, step: 0.02, default: 1.6 },
  { key: 'maxDot', type: 'range', label: 'Max dot', min: 0.3, max: 1.6, step: 0.01, default: 1.05 },
  { key: 'angle', type: 'range', label: 'Screen angle', min: 0, max: 90, step: 0.2, default: 0 },
  { key: 'scatter', type: 'range', label: 'Scatter', min: 0, max: 1, step: 0.01, default: 0 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 40 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'riso' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.8 },
]

const r1 = (n) => Math.round(n * 10) / 10

export default {
  id: 'halftone',
  name: 'Halftone',
  blurb: 'A grid that never moves. Only the dots change size.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = [...palette.colors].reverse()
    const noise = createNoise2D(rng)

    // Spent up front, for the largest grid, so changing `grid` doesn't reshuffle
    // the scatter of the cells that remain.
    const MAX = 90
    const scatterField = new Float64Array(MAX * MAX * 2)
    for (let i = 0; i < scatterField.length; i += 1) scatterField[i] = rng.range(-0.5, 0.5)

    const left = p.margin
    const top = p.margin
    const spanX = width - p.margin * 2
    const spanY = height - p.margin * 2

    // Square cells: count across the short edge, however many fit the long one.
    const cell = Math.min(spanX, spanY) / p.grid
    const cols = Math.max(1, Math.round(spanX / cell))
    const rows = Math.max(1, Math.round(spanY / cell))
    const originX = left + (spanX - cols * cell) / 2
    const originY = top + (spanY - rows * cell) / 2

    const unit = Math.sqrt(width * height)
    const rad = (p.angle * Math.PI) / 180
    const cosA = Math.cos(rad)
    const sinA = Math.sin(rad)

    const buckets = inks.map(() => [])

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const jx = scatterField[((row % MAX) * MAX + (col % MAX)) * 2]
        const jy = scatterField[((row % MAX) * MAX + (col % MAX)) * 2 + 1]
        const cx = originX + (col + 0.5 + jx * p.scatter) * cell
        const cy = originY + (row + 0.5 + jy * p.scatter) * cell

        // Sample the field in a rotated frame, so the screen can be angled the
        // way a print screen is without moving the cells themselves.
        const sx = (cx * cosA - cy * sinA) / unit
        const sy = (cx * sinA + cy * cosA) / unit

        const raw = fbm(noise, sx * p.fieldScale + p.phase, sy * p.fieldScale, p.detail)
        // -1..1 to 0..1, then contrast pushes it toward the extremes.
        let v = (raw + 1) / 2
        v = Math.min(1, Math.max(0, (v - 0.5) * p.contrast + 0.5))
        // Clamped, never skipped. Dropping a dot that shrinks past a threshold
        // changes the shape count as the field modulates, and a changing count
        // is exactly what flickers — measured at 280 flickering frames in 299.
        // A 0.05-unit dot is far under a pixel, so this costs nothing visually.
        const size = Math.max(0.05, v * p.gain * p.maxDot * cell * 0.5)

        const ink = Math.min(inks.length - 1, Math.floor(v * inks.length))

        if (p.shape === 'square') {
          buckets[ink].push({
            tag: 'rect',
            attrs: { x: r1(cx - size), y: r1(cy - size), width: r1(size * 2), height: r1(size * 2) },
          })
        } else if (p.shape === 'diamond') {
          buckets[ink].push({
            tag: 'path',
            attrs: {
              d: `M${r1(cx)},${r1(cy - size)}L${r1(cx + size)},${r1(cy)}L${r1(cx)},${r1(cy + size)}L${r1(cx - size)},${r1(cy)}Z`,
            },
          })
        } else {
          buckets[ink].push({ tag: 'circle', attrs: { cx: r1(cx), cy: r1(cy), r: r1(size) } })
        }
      }
    }

    // One group per ink — a 90 grid is 8100 dots and they'd otherwise each
    // carry their own fill. Every group is emitted even when empty, so that
    // dots crossing between tone buckets can't change the node count either.
    const shapes = buckets.map((children, i) => ({
      tag: 'g',
      attrs: { fill: inks[i] },
      children,
    }))

    return { width, height, background: palette.bg, shapes }
  },
}
