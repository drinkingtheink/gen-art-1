import { createNoise2D, fbm } from '@/core/noise.js'
import { getPalette, paletteOptions } from '@/core/palettes.js'

/**
 * Flow field.
 *
 * A noise field assigns every point on the canvas an angle. Release particles
 * into it, follow the angle, record where they went. Thousands of curves comb
 * themselves into the same current.
 *
 * Each traced curve is a single <path>, so the DOM stays small — the cost here
 * is path *data*, not node count, which is why points are rounded to 1dp and
 * near-collinear ones are dropped before they reach the markup.
 */

const params = [
  { key: 'pathCount', type: 'range', label: 'Curves', min: 50, max: 2000, step: 25, default: 650 },
  { key: 'steps', type: 'range', label: 'Curve length', min: 10, max: 250, step: 5, default: 90 },
  { key: 'stepLength', type: 'range', label: 'Step size', min: 1, max: 12, step: 0.5, default: 4 },
  { key: 'noiseScale', type: 'range', label: 'Field scale', min: 0.2, max: 5, step: 0.1, default: 1.4 },
  { key: 'octaves', type: 'range', label: 'Detail', min: 1, max: 4, step: 1, default: 2 },
  { key: 'angleTurns', type: 'range', label: 'Turbulence', min: 0.25, max: 4, step: 0.25, default: 1 },
  { key: 'start', type: 'select', label: 'Release from', options: [
    { value: 'grid', label: 'Jittered grid' },
    { value: 'random', label: 'Scattered' },
    { value: 'edges', label: 'Edges' },
  ], default: 'grid' },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 120, step: 2, default: 40 },
  { key: 'lineWidth', type: 'range', label: 'Line width', min: 0.2, max: 6, step: 0.1, default: 1 },
  { key: 'opacity', type: 'range', label: 'Opacity', min: 0.05, max: 1, step: 0.05, default: 0.7 },
  { key: 'palette', type: 'select', label: 'Palette', options: paletteOptions, default: 'dusk' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.1, default: 1 },
]

/** 1dp is finer than a pixel at any sane display size, and halves the markup. */
const r1 = (n) => Math.round(n * 10) / 10

/**
 * How far, in canvas units, the drawn line may stray from where the particle
 * actually went. 0.6 is sub-pixel at a 1000px display, so the simplification
 * is invisible.
 *
 * An earlier version dropped points by angle change instead. That's cheaper
 * but its error is unbounded — deviation accumulates over a long run of
 * individually-small turns, measured at up to 3.5 units. Bounding the
 * deviation directly is both more accurate and drops more points.
 */
const SIMPLIFY_TOLERANCE = 0.6
const SIMPLIFY_TOLERANCE_SQ = SIMPLIFY_TOLERANCE * SIMPLIFY_TOLERANCE

/**
 * Largest squared distance from any skipped point to the segment a->b, i.e.
 * the error we'd accept by drawing a->b and throwing the rest away.
 * Squared throughout to keep a sqrt out of the inner loop.
 */
function maxDeviationSq(skipped, ax, ay, bx, by) {
  const vx = bx - ax
  const vy = by - ay
  const lenSq = vx * vx + vy * vy
  let worst = 0
  for (let i = 0; i < skipped.length; i += 2) {
    const px = skipped[i]
    const py = skipped[i + 1]
    let t = lenSq === 0 ? 0 : ((px - ax) * vx + (py - ay) * vy) / lenSq
    t = t < 0 ? 0 : t > 1 ? 1 : t
    const dx = px - (ax + t * vx)
    const dy = py - (ay + t * vy)
    const d = dx * dx + dy * dy
    if (d > worst) worst = d
  }
  return worst
}

export default {
  id: 'flow-field',
  name: 'Flow Field',
  blurb: 'A noise field gives every point an angle. Follow it and see where you end up.',
  params,

  generate({ params: p, rng, width, height }) {
    const palette = getPalette(p.palette)
    const noise = createNoise2D(rng)

    // Palettes run quiet -> loud, which suits filled areas: the dominant
    // colour sits nearest the paper. Line work wants the opposite — thin
    // strokes in the quietest colour vanish against the background — so the
    // weighting reads from the loud end here.
    const inks = [...palette.colors].reverse()

    const left = p.margin
    const top = p.margin
    const right = width - p.margin
    const bottom = height - p.margin
    const spanX = Math.max(1, right - left)
    const spanY = Math.max(1, bottom - top)

    const angleAt = (x, y) =>
      fbm(noise, (x / width) * p.noiseScale, (y / height) * p.noiseScale, p.octaves) *
      Math.PI *
      p.angleTurns

    // Where the particles are released from. A jittered grid combs the whole
    // canvas evenly; edges makes the field read as something flowing through.
    const seeds = []
    if (p.start === 'grid') {
      const cols = Math.max(1, Math.round(Math.sqrt((p.pathCount * spanX) / spanY)))
      const rows = Math.max(1, Math.ceil(p.pathCount / cols))
      const dx = spanX / cols
      const dy = spanY / rows
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols && seeds.length < p.pathCount; c += 1) {
          seeds.push([left + (c + rng.float()) * dx, top + (r + rng.float()) * dy])
        }
      }
    } else if (p.start === 'edges') {
      for (let i = 0; i < p.pathCount; i += 1) {
        const t = rng.float()
        switch (rng.int(0, 3)) {
          case 0: seeds.push([left + t * spanX, top]); break
          case 1: seeds.push([right, top + t * spanY]); break
          case 2: seeds.push([left + t * spanX, bottom]); break
          default: seeds.push([left, top + t * spanY])
        }
      }
    } else {
      for (let i = 0; i < p.pathCount; i += 1) {
        seeds.push([left + rng.float() * spanX, top + rng.float() * spanY])
      }
    }

    const shapes = []

    /**
     * Follow the field from a point and return the path data, or null if the
     * particle left the canvas before drawing anything.
     *
     * `heading` of -1 walks the same field line the other way. A particle
     * released on an edge where the field points outward dies instantly;
     * the line through that point still exists, so we try the inward half
     * before giving up on it.
     */
    const traceFrom = (startX, startY, heading) => {
      let x = startX
      let y = startY

      let d = `M${r1(x)},${r1(y)}`
      let kept = 1

      // anchor = last point committed to the path; skipped = candidates being
      // considered for removal, as a flat x,y,x,y list to avoid per-point
      // allocation in the hot loop.
      let anchorX = x
      let anchorY = y
      const skipped = []

      for (let step = 0; step < p.steps; step += 1) {
        const angle = angleAt(x, y)
        const nextX = x + Math.cos(angle) * p.stepLength * heading
        const nextY = y + Math.sin(angle) * p.stepLength * heading

        if (nextX < left || nextX > right || nextY < top || nextY > bottom) break

        if (
          skipped.length > 0 &&
          maxDeviationSq(skipped, anchorX, anchorY, nextX, nextY) > SIMPLIFY_TOLERANCE_SQ
        ) {
          // Straightening this far would show, so commit the last point we
          // were holding and start measuring again from there.
          anchorY = skipped[skipped.length - 1]
          anchorX = skipped[skipped.length - 2]
          d += `L${r1(anchorX)},${r1(anchorY)}`
          kept += 1
          skipped.length = 0
        }

        skipped.push(nextX, nextY)
        x = nextX
        y = nextY
      }

      // Whatever is still held ends the curve where the particle stopped.
      if (skipped.length > 0) {
        d += `L${r1(skipped[skipped.length - 2])},${r1(skipped[skipped.length - 1])}`
        kept += 1
      }

      return kept < 2 ? null : d
    }

    for (const [startX, startY] of seeds) {
      const d = traceFrom(startX, startY, 1) ?? traceFrom(startX, startY, -1)
      if (d === null) continue

      shapes.push({
        tag: 'path',
        attrs: {
          d,
          fill: 'none',
          stroke: rng.weighted(inks, p.colorBias),
          'stroke-width': p.lineWidth,
          'stroke-opacity': p.opacity,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        },
      })
    }

    return { width, height, background: palette.bg, shapes }
  },
}
