import { getPalette, paletteOptions } from '../core/palettes.js'

/**
 * Glyphs.
 *
 * Invented writing. Each cell holds a character assembled from a few strokes
 * between points on a small lattice — enough shared structure that the page
 * reads as a script with rules, and no meaning at all behind it.
 *
 * The only piece here whose marks are symbols rather than form. Everything
 * else is pattern or field; this asks to be read.
 *
 * Built for showcase: which lattice points each stroke joins is fixed, so the
 * alphabet never changes. Bending, slant and weight move every character at
 * once, the way a hand changes without the letters changing.
 */

const params = [
  { key: 'columns', type: 'range', label: 'Columns', min: 3, max: 26, step: 1, default: 11, structural: true },
  { key: 'strokes', type: 'range', label: 'Strokes', min: 1, max: 6, step: 1, default: 3, structural: true },
  { key: 'variance', type: 'range', label: 'Stroke variance', min: 0, max: 1, step: 0.01, default: 0.5, structural: true },
  { key: 'bend', type: 'range', label: 'Bend', min: -1.2, max: 1.2, step: 0.005, default: 0.3 },
  { key: 'slant', type: 'range', label: 'Slant', min: -35, max: 35, step: 0.2, default: 0 },
  { key: 'weight', type: 'range', label: 'Weight', min: 0.01, max: 0.22, step: 0.001, default: 0.075 },
  { key: 'tracking', type: 'range', label: 'Tracking', min: 0.3, max: 1.1, step: 0.005, default: 0.72 },
  // Leading sets the line height, which sets how many rows fit — change it
  // and the number of characters on the page changes with it.
  { key: 'leading', type: 'range', label: 'Leading', min: 0.5, max: 1.6, step: 0.005, default: 1.05, structural: true },
  { key: 'waver', type: 'range', label: 'Waver', min: 0, max: 2.5, step: 0.005, default: 0.15 },
  { key: 'ascender', type: 'range', label: 'Ascenders', min: 0, max: 1.2, step: 0.005, default: 0.4 },
  { key: 'opacity', type: 'range', label: 'Opacity', min: 0.1, max: 1, step: 0.01, default: 1 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 60 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'terracotta' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 1 },
]

const r1 = (n) => Math.round(n * 10) / 10

// The lattice a character is written on: 3 across, 4 down, like a pen grid.
const LAT_X = 3
const LAT_Y = 4
const MAX_GLYPHS = 26 * 40
const MAX_STROKES = 6

export default {
  id: 'glyphs',
  name: 'Glyphs',
  blurb: 'Rows of characters from no known alphabet.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = [...palette.colors].reverse()

    // The alphabet is settled here, for the largest possible page, so the
    // characters never change when the layout does.
    const alphabet = Array.from({ length: MAX_GLYPHS }, () => ({
      strokes: Array.from({ length: MAX_STROKES }, () => ({
        ax: rng.int(0, LAT_X - 1),
        ay: rng.int(0, LAT_Y - 1),
        bx: rng.int(0, LAT_X - 1),
        by: rng.int(0, LAT_Y - 1),
        curl: rng.range(-1, 1),
        skip: rng.float(),
        rise: rng.float(),
      })),
      count: rng.float(),
      ink: rng.weighted(inks, p.colorBias),
      lean: rng.range(-1, 1),
      wob: rng.range(-1, 1),
    }))

    const left = p.margin
    const top = p.margin
    const spanX = width - p.margin * 2
    const spanY = height - p.margin * 2

    const cols = p.columns
    const cellW = spanX / cols
    const cellH = cellW * p.leading
    const rows = Math.max(1, Math.floor(spanY / cellH))
    const originY = top + (spanY - rows * cellH) / 2

    const glyphW = cellW * p.tracking
    const glyphH = cellH * 0.72
    const slantT = Math.tan((p.slant * Math.PI) / 180)

    const buckets = inks.map(() => [])

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const index = (row * cols + col) % MAX_GLYPHS
        const glyph = alphabet[index]

        const baseX = left + (col + 0.5) * cellW
        const baseY = originY + (row + 0.5) * cellH

        // How many strokes this character uses. Variance spreads the alphabet
        // between sparse and dense characters instead of all being the same.
        const take = Math.max(1, Math.round(p.strokes * (1 - p.variance * 0.6 + glyph.count * p.variance * 1.2)))

        let d = ''
        for (let s = 0; s < Math.min(take, MAX_STROKES); s += 1) {
          const stroke = glyph.strokes[s]
          if (stroke.ax === stroke.bx && stroke.ay === stroke.by) continue

          // Ascenders let some strokes break the body height, which is what
          // stops a page of these reading as a uniform texture.
          //
          // Continuous rather than a threshold: as a cutoff it made strokes
          // jump a third of their height the instant it was crossed, which
          // pops under animation instead of moving.
          const rise = 1 + p.ascender * stroke.rise * 0.75

          const point = (lx, ly) => {
            const u = (lx / (LAT_X - 1) - 0.5) * glyphW
            const v = (ly / (LAT_Y - 1) - 0.5) * glyphH * rise
            const wob = glyph.wob * p.waver * glyphW * 0.2
            return [baseX + u - v * slantT + wob * (ly % 2 ? 1 : -1), baseY + v]
          }

          const [x0, y0] = point(stroke.ax, stroke.ay)
          const [x1, y1] = point(stroke.bx, stroke.by)
          // Control point pushed off the chord's perpendicular: `bend` turns a
          // stick alphabet into a cursive one without changing which points
          // each stroke joins.
          const mx = (x0 + x1) / 2
          const my = (y0 + y1) / 2
          const nx = -(y1 - y0)
          const ny = x1 - x0
          const len = Math.hypot(nx, ny) || 1
          const push = p.bend * stroke.curl * glyphW * 0.35
          d += `M${r1(x0)},${r1(y0)}Q${r1(mx + (nx / len) * push)},${r1(my + (ny / len) * push)} ${r1(x1)},${r1(y1)}`
        }

        if (!d) continue
        const ink = inks.indexOf(glyph.ink)
        buckets[ink < 0 ? 0 : ink].push({ tag: 'path', attrs: { d } })
      }
    }

    // Every group emitted even when empty, so characters changing ink can't
    // change the node count.
    const shapes = buckets.map((children, i) => ({
      tag: 'g',
      attrs: {
        fill: 'none',
        stroke: inks[i],
        'stroke-width': r1(Math.max(0.3, cellW * p.weight)),
        'stroke-opacity': p.opacity,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      },
      children,
    }))

    return { width, height, background: palette.bg, shapes }
  },
}
