/**
 * Polyline simplification with a bounded error.
 *
 * Drops points whose removal would move the drawn line less than `tolerance`
 * from where it actually went. Error is bounded by construction, which an
 * angle-change rule can't promise — many individually-small turns accumulate.
 *
 * 0.6 units is sub-pixel on a canvas whose short edge is ~1000, so the saving
 * is invisible.
 */
export const DEFAULT_TOLERANCE = 0.6

/**
 * Largest squared distance from any held point to the segment a->b: the error
 * we'd accept by drawing a->b and discarding the rest. Squared throughout to
 * keep a sqrt out of the inner loop.
 */
export function maxDeviationSq(held, ax, ay, bx, by) {
  const vx = bx - ax
  const vy = by - ay
  const lenSq = vx * vx + vy * vy
  let worst = 0
  for (let i = 0; i < held.length; i += 2) {
    const px = held[i]
    const py = held[i + 1]
    let t = lenSq === 0 ? 0 : ((px - ax) * vx + (py - ay) * vy) / lenSq
    t = t < 0 ? 0 : t > 1 ? 1 : t
    const dx = px - (ax + t * vx)
    const dy = py - (ay + t * vy)
    const d = dx * dx + dy * dy
    if (d > worst) worst = d
  }
  return worst
}

/**
 * Builds path data incrementally, so a generator that traces a curve step by
 * step never has to hold every point it visited.
 *
 * `round` decides coordinate precision — 1dp is finer than a pixel and halves
 * the markup against full precision.
 */
export function createPathBuilder(startX, startY, tolerance = DEFAULT_TOLERANCE, round = (n) => Math.round(n * 10) / 10) {
  const toleranceSq = tolerance * tolerance
  let d = `M${round(startX)},${round(startY)}`
  let kept = 1
  let anchorX = startX
  let anchorY = startY
  const held = []

  return {
    /** Offer the next point. It's kept only if straightening past it would show. */
    push(x, y) {
      if (held.length > 0 && maxDeviationSq(held, anchorX, anchorY, x, y) > toleranceSq) {
        anchorY = held[held.length - 1]
        anchorX = held[held.length - 2]
        d += `L${round(anchorX)},${round(anchorY)}`
        kept += 1
        held.length = 0
      }
      held.push(x, y)
    },

    /** Path data, ending wherever the last offered point was. */
    finish(close = false) {
      if (held.length > 0) {
        d += `L${round(held[held.length - 2])},${round(held[held.length - 1])}`
        kept += 1
      }
      return { d: close ? `${d}Z` : d, points: kept }
    },

    get points() {
      return kept + (held.length ? 1 : 0)
    },
  }
}

/** Simplify a finished flat [x,y,x,y,…] list in one call. */
export function simplifyPath(flat, tolerance = DEFAULT_TOLERANCE, close = false, round) {
  if (flat.length < 4) return null
  const builder = createPathBuilder(flat[0], flat[1], tolerance, round)
  for (let i = 2; i < flat.length; i += 2) builder.push(flat[i], flat[i + 1])
  return builder.finish(close)
}
