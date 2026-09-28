import { getPalette, paletteOptions } from '../core/palettes.js'

/**
 * Recursive subdivision.
 *
 * Split a rectangle in two, recurse on both halves, stop somewhere, then fill
 * the leaves. Mondrian by way of a dice roll. The interesting knobs are
 * `squareness` (split the long side, or a random side) and `ratioSpread` (cut
 * near the middle, or anywhere), which between them swing the output from an
 * even grid to a field of slivers.
 *
 * Pure: every random value comes from `rng`, so a seed reproduces a piece
 * exactly.
 */

const params = [
  { key: 'maxDepth', type: 'range', label: 'Max depth', min: 1, max: 9, step: 1, default: 6, structural: true },
  { key: 'splitChance', type: 'range', label: 'Split chance', min: 0, max: 1, step: 0.01, default: 0.88, structural: true },
  { key: 'ratioSpread', type: 'range', label: 'Cut spread', min: 0, max: 0.45, step: 0.01, default: 0.22, structural: true },
  { key: 'squareness', type: 'range', label: 'Squareness', min: 0, max: 1, step: 0.01, default: 0.72, structural: true },
  { key: 'minSize', type: 'range', label: 'Min cell', min: 8, max: 200, step: 1, default: 44, structural: true },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 120, step: 2, default: 28, structural: true },
  { key: 'gutter', type: 'range', label: 'Gutter', min: 0, max: 24, step: 0.5, default: 5 },
  { key: 'cornerRadius', type: 'range', label: 'Corner radius', min: 0, max: 40, step: 1, default: 0 },
  { key: 'motifChance', type: 'range', label: 'Motifs', min: 0, max: 1, step: 0.01, default: 0.22, structural: true },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'flame' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.1, default: 1 },
  { key: 'stroke', type: 'color', label: 'Stroke', default: '#1a1a1a' },
  { key: 'strokeWidth', type: 'range', label: 'Stroke width', min: 0, max: 8, step: 0.5, default: 1.5 },
]

/** Levels that split regardless of splitChance, so no seed yields one big rect. */
const FORCED_DEPTH = 2

/** Round to 2dp so the emitted SVG stays readable when copied out. */
const r2 = (n) => Math.round(n * 100) / 100

/**
 * A filled quarter-disc anchored at one corner of the cell.
 * `sx`/`sy` point from that corner toward the cell's interior; the sweep flag
 * follows from their signs (screen y runs downward).
 */
function quarterDisc(cx, cy, radius, sx, sy) {
  const sweep = sx === sy ? 1 : 0
  return [
    `M${r2(cx)},${r2(cy)}`,
    `L${r2(cx + sx * radius)},${r2(cy)}`,
    `A${r2(radius)},${r2(radius)} 0 0 ${sweep} ${r2(cx)},${r2(cy + sy * radius)}`,
    'Z',
  ].join(' ')
}

/** Decorate a leaf cell. Returns zero or more shapes drawn over its fill. */
function motif(cell, color, rng) {
  const { x, y, w, h } = cell
  const short = Math.min(w, h)

  switch (rng.pick(['circle', 'quarter', 'diagonal', 'nested', 'bars'])) {
    case 'circle':
      return [{
        tag: 'circle',
        attrs: { cx: r2(x + w / 2), cy: r2(y + h / 2), r: r2(short * 0.3), fill: color },
      }]

    case 'quarter': {
      const sx = rng.bool() ? 1 : -1
      const sy = rng.bool() ? 1 : -1
      const cx = sx === 1 ? x : x + w
      const cy = sy === 1 ? y : y + h
      return [{ tag: 'path', attrs: { d: quarterDisc(cx, cy, short, sx, sy), fill: color } }]
    }

    case 'diagonal': {
      const up = rng.bool()
      const d = up
        ? `M${r2(x)},${r2(y + h)} L${r2(x + w)},${r2(y)} L${r2(x + w)},${r2(y + h)} Z`
        : `M${r2(x)},${r2(y)} L${r2(x + w)},${r2(y + h)} L${r2(x)},${r2(y + h)} Z`
      return [{ tag: 'path', attrs: { d, fill: color } }]
    }

    case 'nested': {
      const inset = short * rng.range(0.16, 0.3)
      return [{
        tag: 'rect',
        attrs: {
          x: r2(x + inset),
          y: r2(y + inset),
          width: r2(w - inset * 2),
          height: r2(h - inset * 2),
          fill: color,
        },
      }]
    }

    case 'bars':
    default: {
      const count = rng.int(2, 4)
      const vertical = w >= h
      const span = (vertical ? w : h) / (count * 2 + 1)
      return Array.from({ length: count }, (_, i) => ({
        tag: 'rect',
        attrs: vertical
          ? { x: r2(x + span * (i * 2 + 1)), y: r2(y), width: r2(span), height: r2(h), fill: color }
          : { x: r2(x), y: r2(y + span * (i * 2 + 1)), width: r2(w), height: r2(span), fill: color },
      }))
    }
  }
}

export default {
  id: 'subdivision',
  name: 'Recursive Subdivision',
  blurb: 'Split, recurse, stop, fill. Grids and slivers from five rules.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    // Showcase mode can hand in a blended palette; otherwise use the one
    // the params name.
    const palette = override ?? getPalette(p.palette)
    const shapes = []

    // Clip-path ids must be unique in the document. Seeding the token from the
    // rng keeps it deterministic per piece while staying distinct between
    // pieces, so two scenes on one page can't steal each other's clips.
    const token = rng.int(0, 0xffffff).toString(36)
    let clipSeq = 0

    const leaf = (cell) => {
      const inset = p.gutter / 2
      const x = cell.x + inset
      const y = cell.y + inset
      const w = cell.w - p.gutter
      const h = cell.h - p.gutter
      if (w <= 0 || h <= 0) return

      const fill = rng.weighted(palette.colors, p.colorBias)
      const attrs = {
        x: r2(x),
        y: r2(y),
        width: r2(w),
        height: r2(h),
        fill,
      }
      if (p.cornerRadius > 0) attrs.rx = r2(Math.min(p.cornerRadius, Math.min(w, h) / 2))
      if (p.strokeWidth > 0) {
        attrs.stroke = p.stroke
        attrs['stroke-width'] = p.strokeWidth
      }
      shapes.push({ tag: 'rect', attrs })

      // Draw the motif in a colour that isn't the one underneath it, or it
      // silently disappears into the fill.
      if (rng.bool(p.motifChance)) {
        const others = palette.colors.filter((c) => c !== fill)
        const drawn = motif({ x, y, w, h }, rng.pick(others), rng)

        if (attrs.rx) {
          // Corner-anchored motifs square off the cell's rounded corners
          // unless they're clipped to the same shape.
          const id = `${token}-${clipSeq++}`
          shapes.push({
            tag: 'g',
            attrs: { 'clip-path': `url(#${id})` },
            children: [
              {
                tag: 'clipPath',
                attrs: { id },
                children: [{ tag: 'rect', attrs: { x: attrs.x, y: attrs.y, width: attrs.width, height: attrs.height, rx: attrs.rx } }],
              },
              ...drawn,
            ],
          })
        } else {
          shapes.push(...drawn)
        }
      }
    }

    const subdivide = (cell, depth) => {
      const canFit = Math.min(cell.w, cell.h) >= p.minSize * 2
      // The top levels split unconditionally. Letting splitChance roll at the
      // root means a 1-in-8 chance of returning the whole canvas as a single
      // undivided rectangle, which is never the piece anyone wanted.
      const forced = depth < Math.min(FORCED_DEPTH, p.maxDepth)

      if (depth >= p.maxDepth || !canFit || (!forced && !rng.bool(p.splitChance))) {
        leaf(cell)
        return
      }

      // High squareness cuts the long side, keeping cells compact; low
      // squareness picks at random and lets slivers form.
      const cutVertical = rng.bool(p.squareness) ? cell.w >= cell.h : rng.bool()
      const extent = cutVertical ? cell.w : cell.h
      const ratio = rng.range(0.5 - p.ratioSpread, 0.5 + p.ratioSpread)
      // Keep both halves above minSize even when the ratio is extreme.
      const at = Math.min(extent - p.minSize, Math.max(p.minSize, extent * ratio))

      if (cutVertical) {
        subdivide({ x: cell.x, y: cell.y, w: at, h: cell.h }, depth + 1)
        subdivide({ x: cell.x + at, y: cell.y, w: cell.w - at, h: cell.h }, depth + 1)
      } else {
        subdivide({ x: cell.x, y: cell.y, w: cell.w, h: at }, depth + 1)
        subdivide({ x: cell.x, y: cell.y + at, w: cell.w, h: cell.h - at }, depth + 1)
      }
    }

    subdivide(
      { x: p.margin, y: p.margin, w: width - p.margin * 2, h: height - p.margin * 2 },
      0,
    )

    return { width, height, background: palette.bg, shapes }
  },
}
