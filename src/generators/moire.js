import { createNoise2D, fbm } from '../core/noise.js'
import { getPalette, paletteOptions } from '../core/palettes.js'
import { createPathBuilder } from '../core/simplify.js'

/**
 * Moiré.
 *
 * Several families of lines laid over each other at slightly different angles.
 * Nothing in any single layer is interesting; the pattern lives in the
 * interference between them, and shifts violently for tiny changes in angle or
 * spacing. That sensitivity is the point — it makes the piece shimmer under
 * animation in a way none of the others do.
 *
 * Built for showcase: the rng is spent entirely up front on the noise field
 * and the per-layer offsets. Every param after that transforms fixed geometry,
 * so almost nothing here reshuffles.
 */

const params = [
  { key: 'layers', type: 'range', label: 'Layers', min: 2, max: 6, step: 1, default: 3, structural: true },
  { key: 'lineCount', type: 'range', label: 'Lines per layer', min: 10, max: 280, step: 1, default: 130, structural: true },
  { key: 'pattern', type: 'select', label: 'Family', options: [
    { value: 'parallel', label: 'Parallel' },
    { value: 'concentric', label: 'Concentric' },
    { value: 'radial', label: 'Radial' },
  ], default: 'concentric' },
  { key: 'rotation', type: 'range', label: 'Rotation', min: 0, max: 180, step: 0.1, default: 8 },
  { key: 'spread', type: 'range', label: 'Layer spread', min: 0, max: 30, step: 0.05, default: 1.2 },
  { key: 'phase', type: 'range', label: 'Phase', min: 0, max: 1, step: 0.005, default: 0 },
  { key: 'squeeze', type: 'range', label: 'Squeeze', min: 0.3, max: 2.5, step: 0.01, default: 1 },
  { key: 'warp', type: 'range', label: 'Warp', min: 0, max: 120, step: 0.5, default: 9 },
  { key: 'warpScale', type: 'range', label: 'Warp scale', min: 0.2, max: 4, step: 0.02, default: 1.3 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 40 },
  { key: 'lineWidth', type: 'range', label: 'Line width', min: 0.2, max: 6, step: 0.05, default: 1.05 },
  { key: 'opacity', type: 'range', label: 'Opacity', min: 0.1, max: 1, step: 0.01, default: 0.72 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'neon' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 1.2 },
]

const r1 = (n) => Math.round(n * 10) / 10

// Enough samples that a warped line reads as a curve; the simplifier throws
// away whatever the warp didn't actually bend.
const SAMPLES = 34

export default {
  id: 'moire',
  name: 'Moiré',
  blurb: 'The pattern is in the interference.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = [...palette.colors].reverse()
    const noise = createNoise2D(rng)

    // All randomness is spent here, before any param is read for geometry.
    // Drawn for the maximum layer count so changing `layers` doesn't shift the
    // sequence for the layers that remain.
    const layerSeeds = Array.from({ length: 6 }, () => ({
      tilt: rng.range(-1, 1),
      slide: rng.float(),
      ink: rng.weighted(inks, p.colorBias),
    }))

    const left = p.margin
    const top = p.margin
    const right = width - p.margin
    const bottom = height - p.margin
    const cx = (left + right) / 2
    const cy = (top + bottom) / 2
    const spanX = right - left
    const spanY = bottom - top
    const reach = Math.hypot(spanX, spanY) / 2
    const unit = Math.sqrt(width * height)

    /**
     * Perpendicular displacement from the noise field, in canvas units.
     *
     * Sampled at a per-layer offset. Without that every layer gets the same
     * displacement at the same point, the families drift into alignment and
     * the interference — the entire point of the piece — disappears.
     */
    const warpAt = (x, y, layerOffset) =>
      fbm(noise, (x / unit) * p.warpScale + layerOffset, (y / unit) * p.warpScale - layerOffset, 2) *
      p.warp

    const shapes = []

    for (let layerIndex = 0; layerIndex < p.layers; layerIndex += 1) {
      const layer = layerSeeds[layerIndex]
      const angle = ((p.rotation + layerIndex * p.spread + layer.tilt * p.spread * 0.4) * Math.PI) / 180
      const dirX = Math.cos(angle)
      const dirY = Math.sin(angle)
      const perpX = -dirY
      const perpY = dirX
      const slide = (p.phase + layer.slide) % 1
      const fieldOffset = layerIndex * 7.3 + layer.tilt

      const children = []

      for (let line = 0; line < p.lineCount; line += 1) {
        // Fractional position across the family, slid by phase so the whole
        // family can drift sideways without changing how many lines there are.
        const across = ((line + slide) / p.lineCount - 0.5) * 2

        let path
        if (p.pattern === 'concentric') {
          // Clamped, never skipped. Dropping a ring whose radius collapses
          // would change the shape count as phase and squeeze modulate, and a
          // changing count is exactly what flickers under animation.
          const radius = Math.max(0.5, Math.abs(across) * reach * p.squeeze)
          path = createPathBuilder(0, 0, 0.5, r1)
          let first = true
          for (let s = 0; s <= SAMPLES * 2; s += 1) {
            const a = (s / (SAMPLES * 2)) * Math.PI * 2 + angle
            const bx = cx + Math.cos(a) * radius
            const by = cy + Math.sin(a) * radius * (1 / p.squeeze)
            const w = warpAt(bx, by, fieldOffset)
            const x = bx + Math.cos(a) * w
            const y = by + Math.sin(a) * w
            if (first) { path = createPathBuilder(x, y, 0.5, r1); first = false } else path.push(x, y)
          }
        } else if (p.pattern === 'radial') {
          const a = across * Math.PI + angle
          const dx = Math.cos(a)
          const dy = Math.sin(a)
          let first = true
          for (let s = 0; s <= SAMPLES; s += 1) {
            const t = (s / SAMPLES) * reach * p.squeeze
            const bx = cx + dx * t
            const by = cy + dy * t
            const w = warpAt(bx, by, fieldOffset)
            const x = bx + -dy * w
            const y = by + dx * w
            if (first) { path = createPathBuilder(x, y, 0.5, r1); first = false } else path.push(x, y)
          }
        } else {
          const offset = across * reach * p.squeeze
          let first = true
          for (let s = 0; s <= SAMPLES; s += 1) {
            const t = (s / SAMPLES - 0.5) * 2 * reach
            const bx = cx + dirX * t + perpX * offset
            const by = cy + dirY * t + perpY * offset
            const w = warpAt(bx, by, fieldOffset)
            const x = bx + perpX * w
            const y = by + perpY * w
            if (first) { path = createPathBuilder(x, y, 0.5, r1); first = false } else path.push(x, y)
          }
        }

        if (!path) continue
        const { d, points } = path.finish(p.pattern === 'concentric')
        if (points < 2) continue
        children.push({ tag: 'path', attrs: { d } })
      }

      if (!children.length) continue

      // One group per layer carries the paint, the way truchet does — every
      // line in a layer shares it, and there can be hundreds.
      shapes.push({
        tag: 'g',
        attrs: {
          fill: 'none',
          stroke: layer.ink,
          'stroke-width': p.lineWidth,
          'stroke-opacity': p.opacity,
          'stroke-linecap': 'round',
        },
        children,
      })
    }

    return { width, height, background: palette.bg, shapes }
  },
}
