import { createNoise2D, fbm } from '../core/noise.js'
import { getPalette, paletteOptions } from '../core/palettes.js'

/**
 * Cells.
 *
 * A Voronoi tessellation: every point on the plane belongs to whichever site
 * it's nearest, which carves the canvas into irregular convex tiles that fill
 * it exactly. Truchet and halftone tile on a grid and subdivision cuts
 * rectangles; this is the only piece whose tiles are all different shapes and
 * still leave no gap.
 *
 * Built for showcase, and safely so: one site makes exactly one polygon, so
 * drifting the sites changes every tile's *shape* while the node count stays
 * pinned to the site count. Vertices come and go inside a path's `d`, which
 * nothing downstream counts.
 */

const params = [
  { key: 'sites', type: 'range', label: 'Cells', min: 8, max: 320, step: 1, default: 90, structural: true },
  { key: 'drift', type: 'range', label: 'Drift', min: 0, max: 1, step: 0.005, default: 0 },
  { key: 'fieldScale', type: 'range', label: 'Field scale', min: 0.2, max: 4, step: 0.02, default: 1.1 },
  { key: 'phase', type: 'range', label: 'Phase', min: 0, max: 20, step: 0.01, default: 0 },
  { key: 'relax', type: 'range', label: 'Evenness', min: 0, max: 1, step: 0.005, default: 0.45 },
  { key: 'inset', type: 'range', label: 'Inset', min: 0, max: 0.4, step: 0.005, default: 0.06 },
  { key: 'round', type: 'range', label: 'Rounding', min: 0, max: 0.5, step: 0.005, default: 0 },
  { key: 'edge', type: 'range', label: 'Edge', min: 0, max: 5, step: 0.05, default: 0 },
  { key: 'opacity', type: 'range', label: 'Opacity', min: 0.1, max: 1, step: 0.01, default: 1 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 0 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'reef' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.6 },
]

const r1 = (n) => Math.round(n * 10) / 10
const MAX_SITES = 320

/**
 * Clip a convex polygon against the half-plane nearer to `a` than to `b`.
 * Sutherland-Hodgman: a cell starts as the whole frame and every other site
 * takes a bite out of it.
 */
function clipToBisector(poly, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  // Points on the a-side satisfy  d . (p - midpoint) < 0
  const mx = (ax + bx) / 2
  const my = (ay + by) / 2
  const side = (px, py) => dx * (px - mx) + dy * (py - my)

  const out = []
  for (let i = 0; i < poly.length; i += 2) {
    const cx = poly[i]
    const cy = poly[i + 1]
    const nx = poly[(i + 2) % poly.length]
    const ny = poly[(i + 3) % poly.length]
    const sc = side(cx, cy)
    const sn = side(nx, ny)

    if (sc <= 0) out.push(cx, cy)
    if ((sc <= 0 && sn > 0) || (sc > 0 && sn <= 0)) {
      const t = sc / (sc - sn)
      out.push(cx + (nx - cx) * t, cy + (ny - cy) * t)
    }
  }
  return out
}

export default {
  id: 'cells',
  name: 'Cells',
  blurb: 'Territory, resolved without dispute.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = [...palette.colors].reverse()
    const noise = createNoise2D(rng)

    // Sites and inks settled up front, for the largest count, so changing
    // `sites` adds or removes tiles rather than rearranging them.
    const seeds = Array.from({ length: MAX_SITES }, () => ({
      u: rng.float(),
      v: rng.float(),
      ink: rng.weighted(inks, p.colorBias),
      wob: rng.range(0, Math.PI * 2),
    }))

    const left = p.margin
    const top = p.margin
    const spanX = width - p.margin * 2
    const spanY = height - p.margin * 2
    const unit = Math.sqrt(width * height)

    // Evenness nudges each site toward its slot in a jittered lattice, which
    // turns a clumpy random scatter into something closer to a honeycomb.
    const cols = Math.max(1, Math.round(Math.sqrt((p.sites * spanX) / spanY)))
    const rows = Math.max(1, Math.ceil(p.sites / cols))

    const sites = []
    for (let i = 0; i < p.sites; i += 1) {
      const seed = seeds[i]
      const gx = ((i % cols) + 0.5) / cols
      const gy = (Math.floor(i / cols) + 0.5) / rows
      let u = seed.u + (gx - seed.u) * p.relax
      let v = seed.v + (gy - seed.v) * p.relax

      if (p.drift > 0) {
        u += fbm(noise, u * p.fieldScale * 3 + p.phase, v * p.fieldScale * 3, 2) * p.drift * 0.18
        v += fbm(noise, u * p.fieldScale * 3 + 11.7, v * p.fieldScale * 3 + p.phase, 2) * p.drift * 0.18
      }

      sites.push(left + Math.min(1, Math.max(0, u)) * spanX, top + Math.min(1, Math.max(0, v)) * spanY)
    }

    const frame = [left, top, left + spanX, top, left + spanX, top + spanY, left, top + spanY]
    const shapes = []

    for (let i = 0; i < p.sites; i += 1) {
      const ax = sites[i * 2]
      const ay = sites[i * 2 + 1]
      let poly = frame

      for (let j = 0; j < p.sites; j += 1) {
        if (j === i) continue
        poly = clipToBisector(poly, ax, ay, sites[j * 2], sites[j * 2 + 1])
        if (poly.length < 6) break
      }

      // A degenerate cell still emits, collapsed to its site: dropping it
      // would change the node count and flicker.
      let d
      if (poly.length < 6) {
        d = `M${r1(ax)},${r1(ay)}Z`
      } else {
        let cx = 0
        let cy = 0
        for (let k = 0; k < poly.length; k += 2) {
          cx += poly[k]
          cy += poly[k + 1]
        }
        cx /= poly.length / 2
        cy /= poly.length / 2

        const pts = []
        for (let k = 0; k < poly.length; k += 2) {
          pts.push(poly[k] + (cx - poly[k]) * p.inset, poly[k + 1] + (cy - poly[k + 1]) * p.inset)
        }

        if (p.round > 0) {
          // Corners pulled toward their neighbours and joined with quadratics,
          // which rounds the tile without needing a real offset curve.
          d = ''
          const n = pts.length / 2
          for (let k = 0; k < n; k += 1) {
            const x = pts[k * 2]
            const y = pts[k * 2 + 1]
            const px = pts[((k - 1 + n) % n) * 2]
            const py = pts[((k - 1 + n) % n) * 2 + 1]
            const nx = pts[((k + 1) % n) * 2]
            const ny = pts[((k + 1) % n) * 2 + 1]
            const inX = x + (px - x) * p.round
            const inY = y + (py - y) * p.round
            const outX = x + (nx - x) * p.round
            const outY = y + (ny - y) * p.round
            d += k === 0 ? `M${r1(inX)},${r1(inY)}` : `L${r1(inX)},${r1(inY)}`
            d += `Q${r1(x)},${r1(y)} ${r1(outX)},${r1(outY)}`
          }
          d += 'Z'
        } else {
          d = `M${r1(pts[0])},${r1(pts[1])}`
          for (let k = 2; k < pts.length; k += 2) d += `L${r1(pts[k])},${r1(pts[k + 1])}`
          d += 'Z'
        }
      }

      const attrs = { d, fill: seeds[i].ink, 'fill-opacity': p.opacity }
      if (p.edge > 0) {
        attrs.stroke = palette.bg
        attrs['stroke-width'] = p.edge
        attrs['stroke-linejoin'] = 'round'
      }
      shapes.push({ tag: 'path', attrs })
    }

    return { width, height, background: palette.bg, shapes }
  },
}
