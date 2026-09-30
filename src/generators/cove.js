import { getPalette, paletteOptions } from '../core/palettes.js'

/**
 * Cove.
 *
 * Straight stripes painted on an infinity cove — a back wall that curves into
 * the floor with no seam, the thing photographers shoot against so a subject
 * has no horizon behind it. The stripes are parallel and evenly spaced on the
 * surface itself. Everything you see happens to them on the way to the eye:
 * they stay narrow and upright far up the wall, bend through the curve, and
 * then fan out and widen as the floor runs toward you.
 *
 * So there is no drawing here in the usual sense. There is a surface, a camera,
 * and a projection — the picture is what those three agree on. It is the only
 * piece in the set with a third dimension, which is why the controls are a
 * camera's rather than a pen's: how far the floor reaches, how far you are
 * leaning over it, which way you are facing.
 */

const params = [
  { key: 'stripes', type: 'range', label: 'Stripes', min: 6, max: 90, step: 1, default: 34, structural: true },
  { key: 'duty', type: 'range', label: 'Ink width', min: 0.12, max: 0.88, step: 0.005, default: 0.5 },
  // The camera. These three are the piece.
  { key: 'depth', type: 'range', label: 'Depth', min: 0.15, max: 3, step: 0.01, default: 1.15 },
  { key: 'tilt', type: 'range', label: 'Tilt', min: -32, max: 32, step: 0.1, default: 9 },
  { key: 'angle', type: 'range', label: 'Angle', min: -45, max: 45, step: 0.1, default: 0 },
  { key: 'curve', type: 'range', label: 'Cove radius', min: 0.05, max: 1.6, step: 0.01, default: 0.62 },
  { key: 'eye', type: 'range', label: 'Eye height', min: 0.15, max: 2.4, step: 0.01, default: 0.95 },
  { key: 'lens', type: 'range', label: 'Lens', min: 0.5, max: 2.6, step: 0.01, default: 1.15 },
  { key: 'spread', type: 'range', label: 'Spread', min: 0.4, max: 3, step: 0.01, default: 1.5 },
  { key: 'variance', type: 'range', label: 'Irregularity', min: 0, max: 1, step: 0.005, default: 0.12 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 2, default: 0 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'ink' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 2.2 },
]

/** Enough stripes that the pool never runs short, drawn once. See drawPool. */
const MAX_STRIPES = 90

/**
 * Per-stripe randomness, drawn once for the maximum count.
 *
 * The same trick the rosette's rings and the dendrite's nodes use: spend the
 * rng up front so the number of draws never depends on a dial. Stripe count
 * can then change without reshuffling the stripes that remain, and the camera
 * params can be swept without the piece rebuilding itself underneath.
 */
function drawPool(rng, size, inks, bias) {
  const wobble = new Float64Array(size)
  const ink = []
  for (let i = 0; i < size; i += 1) {
    wobble[i] = rng.range(-1, 1)
    ink.push(rng.weighted(inks, bias))
  }
  return { wobble, ink }
}

const r1 = (n) => Math.round(n * 10) / 10

export default {
  id: 'cove',
  name: 'Cove',
  blurb: 'Straight stripes on a curved room. The bend is the floor meeting the wall.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = [...palette.colors].reverse()

    const pool = drawPool(rng, MAX_STRIPES, inks, p.colorBias)
    const count = Math.round(p.stripes)

    /**
     * The surface, in the camera's own space: eye at the origin looking down
     * +z, floor at y = -eye, back wall at z = wall, joined by a quarter-round
     * of radius `curve`.
     */
    const eye = p.eye
    const curve = Math.min(p.curve, eye * 0.98)
    const wall = 1.1 + p.depth * 1.4
    const centreY = -eye + curve
    const centreZ = wall - curve

    const yaw = (p.angle * Math.PI) / 180
    const pitch = (p.tilt * Math.PI) / 180
    const cosYaw = Math.cos(yaw)
    const sinYaw = Math.sin(yaw)
    const cosPitch = Math.cos(pitch)
    const sinPitch = Math.sin(pitch)

    const span = Math.min(width, height) - p.margin * 2
    const cx = width / 2
    const cy = height / 2
    const focal = span * p.lens

    /**
     * Where the surface has to stop, solved rather than guessed.
     *
     * The first version fixed the near edge of the floor at a constant
     * distance, and the picture fell apart at both ends of the dials: too far
     * and the floor was a sliver along the bottom, too near and the fan grew so
     * wide that the frame held only its middle few stripes, which read as
     * plain vertical bars. Both are the same mistake — choosing a distance
     * when what matters is where it lands on the canvas.
     *
     * So both ends are solved for instead. Given the pitch, these return the
     * depth whose projection falls on a chosen scanline, which lets the floor
     * always run just past the bottom edge and the wall always leave the top.
     * The piece then fills the frame at any tilt, eye height or lens.
     */
    const floorDepthAtScanline = (targetY) => {
      const k = (cy - targetY) / focal
      const denom = k * cosPitch + sinPitch
      if (Math.abs(denom) < 1e-6) return null
      return (eye * (k * sinPitch - cosPitch)) / denom
    }

    const wallHeightAtScanline = (targetY, z) => {
      const k = (cy - targetY) / focal
      const denom = cosPitch - k * sinPitch
      if (Math.abs(denom) < 1e-6) return null
      return (z * (sinPitch + k * cosPitch)) / denom
    }

    // A margin of overshoot past each edge, so nothing ends mid-frame.
    const nearSolved = floorDepthAtScanline(height * 1.18)
    const near =
      nearSolved !== null && nearSolved > 0.04
        ? Math.min(nearSolved, centreZ * 0.985)
        : Math.min(0.12, centreZ * 0.985)

    const topSolved = wallHeightAtScanline(-height * 0.18, wall)
    const wallTop = Math.max(centreY + 0.02, topSolved ?? centreY + 2.4)

    /**
     * Points along the surface from the top of the wall to the near edge of
     * the floor. Samples are weighted toward the bend and toward the camera —
     * the wall projects to near-straight lines and needs almost none, while
     * the curve carries the whole shape and the near floor is stretched across
     * most of the frame.
     */
    const path = []
    const WALL_STEPS = 14
    const CURVE_STEPS = 54
    const FLOOR_STEPS = 46

    for (let i = 0; i < WALL_STEPS; i += 1) {
      const t = i / WALL_STEPS
      path.push({ y: wallTop + (centreY - wallTop) * t, z: wall })
    }
    for (let i = 0; i <= CURVE_STEPS; i += 1) {
      const a = (i / CURVE_STEPS) * (Math.PI / 2)
      path.push({ y: centreY - curve * Math.sin(a), z: centreZ + curve * Math.cos(a) })
    }
    for (let i = 1; i <= FLOOR_STEPS; i += 1) {
      // Squared, so samples bunch up where the floor is racing past the lens.
      const t = (i / FLOOR_STEPS) ** 2
      path.push({ y: -eye, z: centreZ + (near - centreZ) * t })
    }

    /** World point to canvas point, or null if it falls behind the lens. */
    const project = (x, y, z) => {
      const rx = x * cosYaw + z * sinYaw
      const rz = -x * sinYaw + z * cosYaw
      const fy = y * cosPitch - rz * sinPitch
      const fz = y * sinPitch + rz * cosPitch
      if (fz < 0.05) return null
      return [cx + (focal * rx) / fz, cy - (focal * fy) / fz]
    }

    const shapes = []

    for (let i = 0; i < count; i += 1) {
      // Stripes are evenly spaced across the surface; the fan is the camera's
      // doing, not the geometry's.
      const step = (p.spread * 2) / count
      const jitter = pool.wobble[i] * p.variance * step * 0.4
      const u0 = -p.spread + i * step + jitter
      const u1 = u0 + step * p.duty

      const leftEdge = []
      const rightEdge = []
      for (const point of path) {
        const a = project(u0, point.y, point.z)
        const b = project(u1, point.y, point.z)
        // A band is only drawn where both of its edges are in front of the
        // lens; losing one would close the polygon across the frame.
        if (!a || !b) continue
        leftEdge.push(a)
        rightEdge.push(b)
      }
      if (leftEdge.length < 2) continue

      const d =
        `M${leftEdge.map(([x, y]) => `${r1(x)},${r1(y)}`).join('L')}` +
        `L${rightEdge.reverse().map(([x, y]) => `${r1(x)},${r1(y)}`).join('L')}Z`

      shapes.push({
        tag: 'path',
        attrs: { d, fill: pool.ink[i % MAX_STRIPES] },
      })
    }

    return { width, height, background: palette.bg, shapes }
  },
}
