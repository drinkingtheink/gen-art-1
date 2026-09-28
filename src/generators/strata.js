import { createNoise2D, fbm } from '../core/noise.js'
import { getPalette, paletteOptions } from '../core/palettes.js'

/**
 * Strata.
 *
 * Bands of solid colour stacked up the canvas, their boundaries pushed around
 * by a noise field — sediment layers, or a landscape flattened into colour.
 * Adjacent bands share a boundary exactly, so there are no seams between them.
 *
 * Built for showcase: `phase` slides the noise field sideways through the
 * boundaries without changing how many there are, so the whole stack undulates
 * while the geometry count stays fixed.
 */

const params = [
  { key: 'bands', type: 'range', label: 'Bands', min: 3, max: 48, step: 1, default: 16, structural: true },
  { key: 'resolution', type: 'range', label: 'Resolution', min: 20, max: 220, step: 5, default: 110, structural: true },
  { key: 'warp', type: 'range', label: 'Warp', min: 0, max: 260, step: 1, default: 78 },
  { key: 'warpScale', type: 'range', label: 'Warp scale', min: 0.1, max: 3, step: 0.01, default: 0.7 },
  { key: 'detail', type: 'range', label: 'Detail', min: 1, max: 4, step: 1, default: 2 },
  { key: 'phase', type: 'range', label: 'Phase', min: 0, max: 20, step: 0.01, default: 0 },
  { key: 'drift', type: 'range', label: 'Drift', min: 0, max: 1.5, step: 0.005, default: 0.35 },
  { key: 'tilt', type: 'range', label: 'Tilt', min: -40, max: 40, step: 0.2, default: 0 },
  { key: 'squash', type: 'range', label: 'Squash', min: 0.2, max: 1, step: 0.005, default: 1 },
  { key: 'edge', type: 'range', label: 'Edge', min: 0, max: 4, step: 0.05, default: 0 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 0 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'sodium' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.5 },
]

const r1 = (n) => Math.round(n * 10) / 10

export default {
  id: 'strata',
  name: 'Strata',
  blurb: 'Solid bands, boundaries pushed around by a field. Sediment, or landscape.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const noise = createNoise2D(rng)

    // Spent up front, for the maximum band count, so changing `bands` doesn't
    // reshuffle the colours of the bands that remain.
    const bandInks = Array.from({ length: 48 }, () => rng.weighted(palette.colors, p.colorBias))
    const bandOffsets = Array.from({ length: 49 }, () => rng.range(0, 100))

    const left = p.margin
    const right = width - p.margin
    const top = p.margin
    const bottom = height - p.margin
    const spanX = right - left
    const spanY = bottom - top
    const unit = Math.sqrt(width * height)
    const tilt = Math.tan((p.tilt * Math.PI) / 180)

    /**
     * The y of boundary `i` at horizontal position `t` (0..1).
     *
     * Boundaries are computed once and shared: band i's floor is band i+1's
     * ceiling, exactly, so no seam can open between them.
     */
    const boundary = (i, t) => {
      const x = left + t * spanX
      const base = top + (i / p.bands) * spanY * p.squash + (spanY * (1 - p.squash)) / 2
      const n = fbm(
        noise,
        (x / unit) * p.warpScale + p.phase,
        bandOffsets[i] + i * p.drift,
        p.detail,
      )
      return base + n * p.warp + (t - 0.5) * spanX * tilt
    }

    const lines = []
    for (let i = 0; i <= p.bands; i += 1) {
      const row = []
      for (let s = 0; s <= p.resolution; s += 1) row.push(boundary(i, s / p.resolution))
      lines.push(row)
    }

    const shapes = []
    for (let i = 0; i < p.bands; i += 1) {
      const topRow = lines[i]
      const bottomRow = lines[i + 1]
      let d = `M${r1(left)},${r1(topRow[0])}`
      for (let s = 1; s <= p.resolution; s += 1) {
        d += `L${r1(left + (s / p.resolution) * spanX)},${r1(topRow[s])}`
      }
      for (let s = p.resolution; s >= 0; s -= 1) {
        d += `L${r1(left + (s / p.resolution) * spanX)},${r1(bottomRow[s])}`
      }
      d += 'Z'

      const attrs = { d, fill: bandInks[i], 'fill-opacity': 1 }
      if (p.edge > 0) {
        attrs.stroke = palette.bg
        attrs['stroke-width'] = p.edge
        attrs['stroke-linejoin'] = 'round'
      }
      shapes.push({ tag: 'path', attrs })
    }

    return { width, height, background: palette.bg, shapes }
  },
}
