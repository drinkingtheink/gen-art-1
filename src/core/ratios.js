/**
 * Canvas shapes.
 *
 * Ratios hold *area* constant rather than a fixed edge, so a margin of 30 or a
 * grid of 12 means the same density of work whatever the shape. A square comes
 * out at exactly 1000x1000, which is what every piece made before ratios
 * existed was authored at — so old permalinks, which carry no ratio, still
 * render exactly as they did.
 */

const TARGET_AREA = 1000 * 1000

const SHAPES = [
  { id: 'square', label: 'Square · 1:1', w: 1, h: 1 },
  { id: 'landscape', label: 'Landscape · 3:2', w: 3, h: 2 },
  { id: 'portrait', label: 'Portrait · 2:3', w: 2, h: 3 },
  { id: 'print', label: 'Print · 4:5', w: 4, h: 5 },
  // 1:√2 is the A-series ratio. At constant area it lands on 1189x841, which
  // is A0 in millimetres — so an export scales to any A size exactly.
  { id: 'a-landscape', label: 'A-series · √2:1', w: Math.SQRT2, h: 1 },
  { id: 'a-portrait', label: 'A-series · 1:√2', w: 1, h: Math.SQRT2 },
  { id: 'wide', label: 'Wide · 16:9', w: 16, h: 9 },
]

export const ratios = SHAPES.map((shape) => {
  const scale = Math.sqrt(TARGET_AREA / (shape.w * shape.h))
  return {
    id: shape.id,
    label: shape.label,
    width: Math.round(shape.w * scale),
    height: Math.round(shape.h * scale),
  }
})

export const ratioById = Object.fromEntries(ratios.map((r) => [r.id, r]))

export const ratioOptions = ratios.map((r) => ({ value: r.id, label: r.label }))

export const DEFAULT_RATIO = 'square'

/** Look up a shape, falling back to square rather than returning undefined. */
export function getRatio(id) {
  return ratioById[id] ?? ratioById[DEFAULT_RATIO]
}
