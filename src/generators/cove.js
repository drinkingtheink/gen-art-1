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
 * leaning over it, which way you are facing, and then where on the canvas that
 * view sits — shifted across the frame and rolled, so the bend can run
 * diagonally or arrive from the side rather than always lying flat across the
 * middle.
 */

const params = [
  { key: 'stripes', type: 'range', label: 'Stripes', min: 6, max: 90, step: 1, default: 32, structural: true },
  { key: 'duty', type: 'range', label: 'Ink width', min: 0.12, max: 0.88, step: 0.005, default: 0.5 },
  // The camera. These three are the piece.
  { key: 'depth', type: 'range', label: 'Depth', min: 0.15, max: 3, step: 0.01, default: 2.2 },
  { key: 'tilt', type: 'range', label: 'Tilt', min: -32, max: 32, step: 0.1, default: 6 },
  { key: 'angle', type: 'range', label: 'Angle', min: -45, max: 45, step: 0.1, default: 0 },
  // Where the view sits on the canvas, as opposed to where the camera stands.
  { key: 'pan', type: 'range', label: 'Pan', min: -0.6, max: 0.6, step: 0.005, default: 0 },
  { key: 'rise', type: 'range', label: 'Rise', min: -0.6, max: 0.6, step: 0.005, default: 0 },
  { key: 'roll', type: 'range', label: 'Roll', min: -180, max: 180, step: 0.2, default: 0 },
  { key: 'curve', type: 'range', label: 'Cove radius', min: 0.05, max: 1.6, step: 0.01, default: 0.62 },
  { key: 'eye', type: 'range', label: 'Eye height', min: 0.15, max: 2.4, step: 0.01, default: 0.95 },
  { key: 'lens', type: 'range', label: 'Lens', min: 0.5, max: 2.6, step: 0.01, default: 1.15 },
  { key: 'variance', type: 'range', label: 'Irregularity', min: 0, max: 1, step: 0.005, default: 0.12 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 2, default: 0 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'flame' },
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
  blurb: 'Perspective, sole author of the curve.',
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
    const focal = span * p.lens

    /**
     * Pan and rise shift the picture across the canvas without touching the
     * camera — a lens shift, not a move, so the convergence of the stripes is
     * unchanged and only the framing slides. Roll turns the whole image, which
     * is what lets the bend run diagonally or come in from the side instead of
     * always lying flat across the middle.
     */
    const cx = width / 2 + p.pan * width
    const cy = height / 2 + p.rise * height
    const roll = (p.roll * Math.PI) / 180
    const cosRoll = Math.cos(roll)
    const sinRoll = Math.sin(roll)

    /**
     * The box the surface has to cover, in the frame the projection works in.
     *
     * Both fits below ask where the canvas edges are. Once the image can roll,
     * the canvas is no longer axis-aligned in that frame, so its corners are
     * turned back and bounded. Covering the bounding box rather than the
     * rotated rectangle paints a little more than is seen, which is clipped
     * and cheap — and far simpler than fitting to a rotated quad.
     */
    const corners = [
      [-cx, -cy],
      [width - cx, -cy],
      [width - cx, height - cy],
      [-cx, height - cy],
    ]
    let fitLeft = Infinity
    let fitRight = -Infinity
    let fitBottom = -Infinity
    for (const [px, py] of corners) {
      const rx = px * cosRoll + py * sinRoll
      const ry = -px * sinRoll + py * cosRoll
      if (rx < fitLeft) fitLeft = rx
      if (rx > fitRight) fitRight = rx
      if (ry > fitBottom) fitBottom = ry
    }
    const fitSpan = fitRight - fitLeft

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
     * So the near edge is solved instead: given the pitch, this returns the
     * depth whose projection lands on a chosen scanline, which lets the floor
     * always run just past the bottom of the frame whatever the tilt, eye
     * height or lens.
     */
    const floorDepthAtScanline = (targetY) => {
      const k = -targetY / focal
      const denom = k * cosPitch + sinPitch
      if (Math.abs(denom) < 1e-6) return null
      // Yaw swings the floor away from the axis, so the depth that lands on a
      // scanline is further out by the same factor.
      return (eye * (k * sinPitch - cosPitch)) / denom / Math.max(0.2, cosYaw)
    }

    // A little past the far edge of the box, so the floor never ends mid-frame.
    const nearSolved = floorDepthAtScanline(fitBottom + fitSpan * 0.14)
    const near =
      nearSolved !== null && nearSolved > 0.04
        ? Math.min(nearSolved, centreZ * 0.985)
        : Math.min(0.12, centreZ * 0.985)

    /**
     * The wall simply runs off the top.
     *
     * Solving its height the way the floor's depth is solved does not work,
     * because yaw puts one side of the wall further away than the other, so a
     * height that clears the frame head-on leaves a triangle of bare
     * background at an angle. Rather than chase that coupling, the wall is
     * built tall and the excess falls outside the frame, where it is clipped
     * and costs nothing. A plane projects to straight lines, so four samples
     * describe it exactly however tall it is.
     */
    const wallTop = centreY + 60

    /**
     * Points along the surface from the top of the wall to the near edge of
     * the floor. Samples are weighted toward the bend and toward the camera —
     * the wall projects to near-straight lines and needs almost none, while
     * the curve carries the whole shape and the near floor is stretched across
     * most of the frame.
     */
    const path = []
    const WALL_STEPS = 4
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

    /**
     * The projection, in the frame the fits are expressed in: centred on the
     * optical axis, before roll and before the shift onto the canvas.
     */
    const projectRaw = (x, y, z) => {
      const rx = x * cosYaw + z * sinYaw
      const rz = -x * sinYaw + z * cosYaw
      const fy = y * cosPitch - rz * sinPitch
      const fz = y * sinPitch + rz * cosPitch
      if (fz < 0.05) return null
      return [(focal * rx) / fz, -(focal * fy) / fz]
    }

    /** The same point on the canvas, rolled and shifted into place. */
    const project = (x, y, z) => {
      const raw = projectRaw(x, y, z)
      if (!raw) return null
      const [rx, ry] = raw
      return [cx + rx * cosRoll - ry * sinRoll, cy + rx * sinRoll + ry * cosRoll]
    }

    /**
     * How wide the painted band has to be, also solved.
     *
     * A fixed width left wedges of bare floor in the bottom corners, because
     * the nearer the floor comes the more of it the lens sees sideways. For
     * every point on the surface this asks what stripe position would land on
     * the left and right edges of the canvas, and paints across the widest
     * answer — so the stripes run off all four sides whatever the camera does,
     * including when `angle` swings the view off-centre and the two sides stop
     * matching.
     */
    let uMin = Infinity
    let uMax = -Infinity
    for (const point of path) {
      // Only what is on screen gets a say. Without this the wall's far upper
      // reaches — deliberately miles above the frame — would demand a span
      // wide enough to cover them, and spread the stripes until the visible
      // part held only a handful.
      const probe = projectRaw(0, point.y, point.z)
      if (!probe || probe[1] < -fitSpan * 1.3 || probe[1] > fitBottom + fitSpan * 0.4) continue
      for (const edge of [fitLeft, fitRight]) {
        // Solved exactly, because `u` appears on both sides: yawing the camera
        // makes a stripe's distance depend on which stripe it is. Treating the
        // depth as fixed was near enough head-on and opened blank wedges as
        // soon as `angle` moved off zero.
        const shift = edge
        const numer =
          shift * (point.y * sinPitch + point.z * cosYaw * cosPitch) - focal * point.z * sinYaw
        const denom = focal * cosYaw + shift * sinYaw * cosPitch
        if (Math.abs(denom) < 1e-6) continue
        const u = numer / denom
        if (!Number.isFinite(u)) continue
        if (u < uMin) uMin = u
        if (u > uMax) uMax = u
      }
    }
    if (!Number.isFinite(uMin) || !Number.isFinite(uMax) || uMax - uMin < 1e-4) {
      uMin = -2
      uMax = 2
    }
    const pad = (uMax - uMin) * 0.04
    uMin -= pad
    uMax += pad

    const shapes = []

    for (let i = 0; i < count; i += 1) {
      // Stripes are evenly spaced across the surface; the fan is the camera's
      // doing, not the geometry's.
      const step = (uMax - uMin) / count
      const jitter = pool.wobble[i] * p.variance * step * 0.4
      const u0 = uMin + i * step + jitter
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
