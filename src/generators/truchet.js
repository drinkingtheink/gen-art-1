import { getPalette, paletteOptions } from '../core/palettes.js'

/**
 * Truchet tiles.
 *
 * Every cell gets the same motif at a random orientation. Because the motif
 * always meets the cell edge at the same points, neighbours join up whatever
 * they rolled, and the grid knits itself into continuous paths nobody
 * designed.
 *
 * Cells may subdivide into 2x2 before drawing, which breaks the regular grid
 * and gives the pattern more than one scale to read at.
 */

const params = [
  { key: 'grid', type: 'range', label: 'Grid', min: 2, max: 40, step: 1, default: 12, structural: true },
  { key: 'tileSet', type: 'select', label: 'Tile', options: [
    { value: 'arcs', label: 'Quarter arcs' },
    { value: 'lines', label: 'Straight joins' },
    { value: 'diagonals', label: 'Diagonals' },
    { value: 'mixed', label: 'Arcs + diagonals' },
    { value: 'quarterFill', label: 'Filled quarters' },
  ], default: 'arcs' },
  { key: 'subdivideChance', type: 'range', label: 'Subdivide', min: 0, max: 1, step: 0.01, default: 0.22, structural: true },
  { key: 'maxSubdivide', type: 'range', label: 'Subdivide depth', min: 0, max: 3, step: 1, default: 1, structural: true },
  { key: 'lineWeight', type: 'range', label: 'Line weight', min: 0.02, max: 0.6, step: 0.01, default: 0.28 },
  { key: 'inset', type: 'range', label: 'Tile gap', min: 0, max: 0.3, step: 0.01, default: 0 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 120, step: 2, default: 30 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'ocean-sunset' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.1, default: 1 },
  { key: 'opacity', type: 'range', label: 'Opacity', min: 0.1, max: 1, step: 0.05, default: 1 },
  { key: 'roundCaps', type: 'toggle', label: 'Round caps', default: true },
]

const r2 = (n) => Math.round(n * 100) / 100

// Subdividing is exponential — depth 3 turns one cell into 64 — so a 40x40
// grid could ask for 100k cells. Budget the whole piece instead of trusting
// the params to be sensible together.
const MAX_CELLS = 3000
const MIN_CELL = 6

/**
 * A quarter arc of radius `r` centred on a cell corner, running between the
 * midpoints of the two edges that meet there. `sx`/`sy` point from the corner
 * into the cell; the sweep flag follows from their signs (screen y is down).
 */
function quarterArc(cx, cy, r, sx, sy) {
  const sweep = sx === sy ? 1 : 0
  return `M${r2(cx + sx * r)},${r2(cy)} A${r2(r)},${r2(r)} 0 0 ${sweep} ${r2(cx)},${r2(cy + sy * r)}`
}

/** Same endpoints as quarterArc, joined with straight segments instead. */
function cornerJoin(cx, cy, r, sx, sy) {
  return `M${r2(cx + sx * r)},${r2(cy)} L${r2(cx + sx * r * 0.5)},${r2(cy + sy * r * 0.5)} L${r2(cx)},${r2(cy + sy * r)}`
}

function filledQuarter(cx, cy, r, sx, sy) {
  const sweep = sx === sy ? 1 : 0
  return `M${r2(cx)},${r2(cy)} L${r2(cx + sx * r)},${r2(cy)} A${r2(r)},${r2(r)} 0 0 ${sweep} ${r2(cx)},${r2(cy + sy * r)} Z`
}

/**
 * One tile. `flip` is the orientation: the two motifs sit on opposite corner
 * pairs, which is the whole Truchet trick — either way, the tile meets all
 * four edges at their midpoints.
 */
function tile(kind, x, y, size, flip) {
  const r = size / 2
  // flip 0 -> top-left and bottom-right; flip 1 -> top-right and bottom-left.
  const corners = flip
    ? [[x + size, y, -1, 1], [x, y + size, 1, -1]]
    : [[x, y, 1, 1], [x + size, y + size, -1, -1]]

  switch (kind) {
    case 'diagonals':
      return flip
        ? [{ d: `M${r2(x + size)},${r2(y)} L${r2(x)},${r2(y + size)}`, fill: false }]
        : [{ d: `M${r2(x)},${r2(y)} L${r2(x + size)},${r2(y + size)}`, fill: false }]

    case 'lines':
      return corners.map(([cx, cy, sx, sy]) => ({ d: cornerJoin(cx, cy, r, sx, sy), fill: false }))

    case 'quarterFill':
      return corners.map(([cx, cy, sx, sy]) => ({ d: filledQuarter(cx, cy, r, sx, sy), fill: true }))

    case 'arcs':
    default:
      return corners.map(([cx, cy, sx, sy]) => ({ d: quarterArc(cx, cy, r, sx, sy), fill: false }))
  }
}

export default {
  id: 'truchet',
  name: 'Truchet Tiles',
  blurb: 'Arcs meeting at every edge, forming paths.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    // Showcase mode can hand in a blended palette; otherwise use the one
    // the params name.
    const palette = override ?? getPalette(p.palette)
    // Tiles are the subject sitting on the paper, so weight from the loud end
    // — the same reason flow field does.
    const inks = [...palette.colors].reverse()

    // Tiles are collected into buckets sharing a colour and stroke width, then
    // emitted as one <g> each. Every tile carries the same handful of paint
    // attributes, and repeating them on thousands of elements costs more than
    // the geometry does.
    const buckets = new Map()
    let cells = 0

    const draw = (x, y, size) => {
      cells += 1
      const pad = size * p.inset
      const ix = x + pad
      const iy = y + pad
      const inner = size - pad * 2
      if (inner <= 0) return

      const kind = p.tileSet === 'mixed' ? rng.pick(['arcs', 'diagonals']) : p.tileSet
      const flip = rng.int(0, 1)
      const color = rng.weighted(inks, p.colorBias)
      const weight = r2(inner * p.lineWeight)

      for (const part of tile(kind, ix, iy, inner, flip)) {
        const key = part.fill ? `f|${color}` : `s|${color}|${weight}`
        let bucket = buckets.get(key)
        if (!bucket) {
          bucket = {
            attrs: part.fill
              ? { fill: color, 'fill-opacity': p.opacity }
              : {
                  fill: 'none',
                  stroke: color,
                  'stroke-width': weight,
                  'stroke-opacity': p.opacity,
                  'stroke-linecap': p.roundCaps ? 'round' : 'butt',
                },
            children: [],
          }
          buckets.set(key, bucket)
        }
        bucket.children.push({ tag: 'path', attrs: { d: part.d } })
      }
    }

    const place = (x, y, size, depth) => {
      const canSplit =
        depth < p.maxSubdivide &&
        size / 2 >= MIN_CELL &&
        cells + 4 <= MAX_CELLS &&
        rng.bool(p.subdivideChance)

      if (!canSplit) {
        draw(x, y, size)
        return
      }

      const half = size / 2
      place(x, y, half, depth + 1)
      place(x + half, y, half, depth + 1)
      place(x, y + half, half, depth + 1)
      place(x + half, y + half, half, depth + 1)
    }

    // Tiles must stay square — the edge-midpoint trick is what makes
    // neighbours connect — so `grid` counts cells along the short edge and the
    // long edge takes however many fit. Density then reads the same whatever
    // the canvas shape. Any remainder is split evenly as a centred inset.
    const availWidth = width - p.margin * 2
    const availHeight = height - p.margin * 2
    const size = Math.min(availWidth, availHeight) / p.grid
    const cols = Math.max(1, Math.round(availWidth / size))
    const rows = Math.max(1, Math.round(availHeight / size))
    const originX = p.margin + (availWidth - cols * size) / 2
    const originY = p.margin + (availHeight - rows * size) / 2

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        place(originX + col * size, originY + row * size, size, 0)
      }
    }

    const shapes = [...buckets.values()].map((b) => ({
      tag: 'g',
      attrs: b.attrs,
      children: b.children,
    }))

    return { width, height, background: palette.bg, shapes }
  },
}
