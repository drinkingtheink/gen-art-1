import { createNoise2D, fbm } from '../core/noise.js'
import { getPalette, paletteOptions } from '../core/palettes.js'

/**
 * Packing.
 *
 * Discs grown into whatever space is left. Each takes a position decided in
 * advance and then swells until it touches something already placed, so the
 * sizes aren't chosen — they're what the earlier discs left behind. Big ones
 * open, small ones crowding the seams.
 *
 * The only piece here with discrete objects at wildly different scales:
 * everything else is either one continuous field or marks of roughly one size.
 *
 * Built for showcase: the positions and the order are fixed, so a disc's
 * radius is a continuous function of the params. Every disc is emitted even
 * when it shrinks to nothing, because dropping one would change the node
 * count and flicker.
 */

const params = [
  { key: 'count', type: 'range', label: 'Discs', min: 50, max: 1400, step: 10, default: 500, structural: true },
  { key: 'maxRadius', type: 'range', label: 'Max size', min: 0.02, max: 0.35, step: 0.002, default: 0.13 },
  { key: 'padding', type: 'range', label: 'Padding', min: 0, max: 24, step: 0.2, default: 3 },
  { key: 'fieldScale', type: 'range', label: 'Field scale', min: 0.2, max: 4, step: 0.02, default: 1.2 },
  { key: 'phase', type: 'range', label: 'Phase', min: 0, max: 20, step: 0.01, default: 0 },
  { key: 'bite', type: 'range', label: 'Field bite', min: 0, max: 1, step: 0.005, default: 0.55 },
  { key: 'drift', type: 'range', label: 'Drift', min: 0, max: 2.5, step: 0.005, default: 0 },
  { key: 'ring', type: 'range', label: 'Ring', min: 0, max: 1, step: 0.005, default: 0 },
  { key: 'edge', type: 'range', label: 'Edge', min: 0, max: 5, step: 0.05, default: 0 },
  { key: 'opacity', type: 'range', label: 'Opacity', min: 0.1, max: 1, step: 0.01, default: 1 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 30 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'golden-glow' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.7 },
]

const r1 = (n) => Math.round(n * 10) / 10
const MAX_DISCS = 1400

export default {
  id: 'packing',
  name: 'Packing',
  blurb: 'Discs of every size, admitting no gap.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = [...palette.colors].reverse()
    const noise = createNoise2D(rng)

    // Positions, order and ink are all settled up front, for the maximum
    // count, so changing `count` adds or removes discs from the end rather
    // than rearranging the ones that stay.
    const seeds = Array.from({ length: MAX_DISCS }, () => ({
      u: rng.float(),
      v: rng.float(),
      ink: rng.weighted(inks, p.colorBias),
    }))

    const left = p.margin
    const top = p.margin
    const spanX = width - p.margin * 2
    const spanY = height - p.margin * 2
    const unit = Math.sqrt(width * height)
    const maxR = p.maxRadius * Math.min(spanX, spanY)

    const placed = []
    const shapes = []

    for (let i = 0; i < p.count; i += 1) {
      const seed = seeds[i]

      // Positions drift through the field rather than sitting still. Sizes
      // alone barely move: the discs fill whatever space exists however the
      // field is set, so total inked area stayed within 7% across a whole
      // shot. Letting them wander changes who touches whom, and the packing
      // genuinely rearranges.
      const wobbleX = fbm(noise, seed.u * 3 + p.phase, seed.v * 3, 2) * p.drift * maxR
      const wobbleY = fbm(noise, seed.u * 3 + 17.3, seed.v * 3 + p.phase, 2) * p.drift * maxR

      const x = Math.min(left + spanX, Math.max(left, left + seed.u * spanX + wobbleX))
      const y = Math.min(top + spanY, Math.max(top, top + seed.v * spanY + wobbleY))

      // The field decides how large this disc is *allowed* to get; the discs
      // already placed decide how large it actually gets.
      const field = (fbm(noise, (x / unit) * p.fieldScale + p.phase, (y / unit) * p.fieldScale, 2) + 1) / 2
      let radius = maxR * (1 - p.bite + p.bite * field)

      // Stay inside the frame.
      radius = Math.min(radius, x - left, right(x), y - top, bottom(y))

      for (const other of placed) {
        const gap = Math.hypot(x - other.x, y - other.y) - other.r - p.padding
        if (gap < radius) radius = gap
        if (radius <= 0) break
      }

      radius = Math.max(0, radius)
      placed.push({ x, y, r: radius })

      // Emitted even at zero radius: a disappearing disc would change the node
      // count, and a changing count is what flickers under animation.
      const attrs = { cx: r1(x), cy: r1(y), r: r1(Math.max(0.01, radius)) }
      if (p.ring > 0) {
        attrs.fill = 'none'
        attrs.stroke = seed.ink
        attrs['stroke-width'] = r1(Math.max(0.2, radius * p.ring))
        attrs['stroke-opacity'] = p.opacity
      } else {
        attrs.fill = seed.ink
        attrs['fill-opacity'] = p.opacity
        if (p.edge > 0) {
          attrs.stroke = palette.bg
          attrs['stroke-width'] = p.edge
        }
      }
      shapes.push({ tag: 'circle', attrs })
    }

    function right(x) {
      return left + spanX - x
    }
    function bottom(y) {
      return top + spanY - y
    }

    return { width, height, background: palette.bg, shapes }
  },
}
