import { createNoise2D, fbm } from '@/core/noise.js'
import { getPalette, paletteOptions } from '@/core/palettes.js'

/**
 * Blocks.
 *
 * A field of heights drawn in isometric projection — the only piece here that
 * claims a third dimension. Nothing is actually three-dimensional; each cell is
 * three flat quads shaded as if lit from one side, and the eye assembles a
 * solid from that.
 *
 * Draw order does the occluding: cells are emitted back to front so nearer
 * blocks paint over further ones. No depth buffer, just painting in the right
 * sequence.
 *
 * Built for showcase: the lattice never changes, so sliding the field through
 * it makes every block rise and fall while the geometry count stays fixed.
 */

const params = [
  { key: 'grid', type: 'range', label: 'Grid', min: 4, max: 40, step: 1, default: 18, structural: true },
  { key: 'rise', type: 'range', label: 'Height', min: 0, max: 300, step: 1, default: 120 },
  { key: 'fieldScale', type: 'range', label: 'Field scale', min: 0.2, max: 4, step: 0.02, default: 1.1 },
  { key: 'detail', type: 'range', label: 'Detail', min: 1, max: 4, step: 1, default: 2 },
  { key: 'phase', type: 'range', label: 'Phase', min: 0, max: 20, step: 0.01, default: 0 },
  { key: 'pitch', type: 'range', label: 'Pitch', min: 0.15, max: 0.85, step: 0.005, default: 0.5 },
  { key: 'gap', type: 'range', label: 'Gap', min: 0, max: 0.4, step: 0.005, default: 0.06 },
  { key: 'shade', type: 'range', label: 'Shading', min: 0, max: 1, step: 0.01, default: 0.55 },
  { key: 'floor', type: 'range', label: 'Floor', min: 0, max: 1, step: 0.005, default: 0.12 },
  { key: 'zoom', type: 'range', label: 'Zoom', min: 0.5, max: 1.4, step: 0.005, default: 0.94 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 30 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'sodium' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.6 },
]

const r1 = (n) => Math.round(n * 10) / 10

const toRgb = (hex) => {
  const h = hex.replace('#', '')
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)]
}
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')

/** Move a colour toward black (t < 0) or white (t > 0). Fakes the lighting. */
const shadeHex = (hex, t) => {
  const c = toRgb(hex)
  const target = t < 0 ? 0 : 255
  const k = Math.abs(t)
  return toHex(c.map((v) => v + (target - v) * k))
}

export default {
  id: 'blocks',
  name: 'Blocks',
  blurb: 'A height field, seen from the corner. The solidity is painted on.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = [...palette.colors].reverse()
    const noise = createNoise2D(rng)
    const drift = rng.range(0, 40)

    const n = p.grid
    const spanX = width - p.margin * 2
    const spanY = height - p.margin * 2

    // Isometric: one grid step right is (+w/2, +h/2), one step down is
    // (-w/2, +h/2). The lattice spans 2n half-steps across and n down.
    const unit = (Math.min(spanX / n, spanY / (n * p.pitch + 1)) * p.zoom) / 1
    const halfW = unit / 2
    const halfH = (unit * p.pitch) / 2
    const cx = width / 2
    const cy = height / 2 - (n * halfH) / 2

    const heightAt = (i, j) => {
      const v = fbm(noise, (i / n) * p.fieldScale + p.phase + drift, (j / n) * p.fieldScale + drift, p.detail)
      return (Math.max(0, (v + 1) / 2 - p.floor) / Math.max(0.001, 1 - p.floor)) * p.rise
    }

    const shapes = []
    const inset = p.gap * halfW

    // Back to front: further blocks first, so nearer ones paint over them.
    for (let d = 0; d <= (n - 1) * 2; d += 1) {
      for (let i = 0; i < n; i += 1) {
        const j = d - i
        if (j < 0 || j >= n) continue

        const h = heightAt(i, j)
        const bx = cx + (i - j) * halfW
        const by = cy + (i + j) * halfH

        const ink = inks[Math.min(inks.length - 1, Math.floor((h / Math.max(1, p.rise)) * inks.length))]
        const w = halfW - inset
        const hh = halfH - inset * p.pitch

        // Top face, then the two visible sides, each a flat quad.
        const topY = by - h
        const top = `M${r1(bx)},${r1(topY - hh)}L${r1(bx + w)},${r1(topY)}L${r1(bx)},${r1(topY + hh)}L${r1(bx - w)},${r1(topY)}Z`
        const leftFace = `M${r1(bx - w)},${r1(topY)}L${r1(bx)},${r1(topY + hh)}L${r1(bx)},${r1(by + hh)}L${r1(bx - w)},${r1(by)}Z`
        const rightFace = `M${r1(bx + w)},${r1(topY)}L${r1(bx)},${r1(topY + hh)}L${r1(bx)},${r1(by + hh)}L${r1(bx + w)},${r1(by)}Z`

        shapes.push({ tag: 'path', attrs: { d: leftFace, fill: shadeHex(ink, -p.shade * 0.55) } })
        shapes.push({ tag: 'path', attrs: { d: rightFace, fill: shadeHex(ink, -p.shade * 0.28) } })
        shapes.push({ tag: 'path', attrs: { d: top, fill: shadeHex(ink, p.shade * 0.18) } })
      }
    }

    return { width, height, background: palette.bg, shapes }
  },
}
