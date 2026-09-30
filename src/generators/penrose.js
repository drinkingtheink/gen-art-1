import { getPalette, legibleInks, paletteOptions } from '../core/palettes.js'

/**
 * Penrose tiling.
 *
 * Two rhombs — one fat, one thin — that tile the plane and can *only* tile it
 * without ever repeating. Slide a copy of the finished pattern over itself and
 * no shift will ever line it up, at any distance, which is not true of any
 * other pattern here: every grid, lattice and Truchet field in this studio
 * repeats if you walk far enough.
 *
 * It is built by deflation rather than by laying tiles down. Start with a few
 * triangles, cut each one into smaller triangles of the same two shapes by the
 * golden ratio, and repeat. Nothing is ever placed or rejected, no constraint
 * is ever checked, and the tiling that falls out is forced — which is the
 * whole point, and why there is no randomness in the geometry at all. The
 * seed only decides where colour lands.
 *
 * Built for showcase, though not the way the rest are — see the wave
 * parameters below. Depth is structural; spin, zoom, grout and the whole wave
 * are continuous, and none of them changes how many random numbers are drawn
 * or how many tiles come out.
 *
 * Deliberately without the classic arc decoration — the two arcs per rhomb
 * that join across tiles into continuous loops. They only join if each tile
 * knows which of its corners is marked, which means carrying that marking
 * through every deflation; arcs that join *sometimes* are worse than none,
 * because joining is the entire point of them.
 */

const params = [
  { key: 'patch', type: 'select', label: 'Centre', options: [
    { value: 'sun', label: 'Sun' },
    { value: 'thin', label: 'Single thin rhomb' },
    { value: 'rhomb', label: 'Single rhomb' },
  ], default: 'sun', structural: true },
  { key: 'depth', type: 'range', label: 'Generations', min: 1, max: 9, step: 1, default: 6, structural: true, wander: 0.45 },
  { key: 'zoom', type: 'range', label: 'Zoom', min: 0.5, max: 6, step: 0.005, default: 1.15, wander: 0.35 },
  { key: 'spin', type: 'range', label: 'Spin', min: 0, max: 360, step: 0.2, default: 0 },
  { key: 'inset', type: 'range', label: 'Grout', min: 0, max: 0.4, step: 0.002, default: 0.06 },
  /**
   * The wave, and the reason this piece has anything to animate.
   *
   * A Penrose tiling cannot deform. Deflation has no continuous knob — the
   * golden ratio is not a slider — so the tiling that comes out is the only
   * one there is, and moving a camera over a fixed pattern is a slideshow
   * rather than motion. What *can* move is each tile on its own: a travelling
   * wave that turns every rhomb about its own centre and opens the grout
   * around it, by an amount read off where the tile sits. The tiling stays
   * exactly where it is and the surface comes alive over it, like light
   * crossing a mosaic. At amplitude 0 every tile sits flush and the pattern
   * is perfect again.
   */
  { key: 'wave', type: 'range', label: 'Wave', min: 0, max: 1, step: 0.005, default: 0 },
  { key: 'waveForm', type: 'select', label: 'Wave form', options: [
    { value: 'rings', label: 'Rings from the centre' },
    { value: 'bands', label: 'Bands across' },
  ], default: 'rings' },
  { key: 'waveScale', type: 'range', label: 'Wave scale', min: 0.4, max: 14, step: 0.05, default: 3.2 },
  { key: 'wavePhase', type: 'range', label: 'Wave phase', min: 0, max: 360, step: 0.2, default: 0 },
  { key: 'waveTurn', type: 'range', label: 'Wave turn', min: 0, max: 90, step: 0.2, default: 42 },
  { key: 'tint', type: 'select', label: 'Colour by', options: [
    { value: 'fivefold', label: 'Orientation · fivefold' },
    { value: 'shape', label: 'Tile shape' },
    { value: 'radius', label: 'Distance out' },
    { value: 'scatter', label: 'Scattered' },
  ], default: 'fivefold' },
  { key: 'lineWidth', type: 'range', label: 'Tile edge', min: 0, max: 6, step: 0.05, default: 0.9 },
  { key: 'fill', type: 'range', label: 'Fill', min: 0, max: 1, step: 0.01, default: 1 },
  { key: 'opacity', type: 'range', label: 'Opacity', min: 0.1, max: 1, step: 0.01, default: 1, wander: 0.5 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 40 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'riso' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.6 },
]

const PHI = (1 + Math.sqrt(5)) / 2
const TAU = Math.PI * 2

/**
 * Deflation multiplies triangles by roughly φ² each generation, so the depth
 * dial runs away exactly the way dendrite's does. The budget caps the total
 * and generations give way.
 */
const TILE_BUDGET = 24000

const r1 = (n) => Math.round(n * 10) / 10

/**
 * One deflation step.
 *
 * `kind` 0 is the thin half-rhomb, 1 the fat one. A thin triangle cuts into
 * one of each; a fat one into two fat and a thin. The cut points sit at 1/φ
 * along an edge, which is the only ratio that makes the children similar to
 * their parents — and is the reason the pattern can't be periodic.
 */
function deflate(tiles) {
  const out = []
  for (const [kind, ax, ay, bx, by, cx, cy] of tiles) {
    if (kind === 0) {
      const px = ax + (bx - ax) / PHI
      const py = ay + (by - ay) / PHI
      out.push([0, cx, cy, px, py, bx, by], [1, px, py, cx, cy, ax, ay])
    } else {
      const qx = bx + (ax - bx) / PHI
      const qy = by + (ay - by) / PHI
      const rx = bx + (cx - bx) / PHI
      const ry = by + (cy - by) / PHI
      out.push([1, rx, ry, cx, cy, ax, ay], [1, qx, qy, rx, ry, bx, by], [0, rx, ry, qx, qy, ax, ay])
    }
  }
  return out
}

/**
 * The patch a tiling grows from.
 *
 * `kind` 0 is the acute half-rhomb (36-72-72, legs 1, base 1/phi) and 1 the
 * obtuse one (108-36-36, legs 1, base phi). In both, A is the apex between the
 * two equal legs — the deflation rule depends on that labelling, and a seed
 * that gets it wrong does not fail loudly: it tiles its region without gaps,
 * conserving area exactly, while producing scalene triangles that are no
 * longer Penrose tiles at all. The census in the commit that added this piece
 * is the check — a correct patch yields exactly two isoceles shapes at every
 * generation, in Fibonacci proportion.
 */
function seedPatch(patch) {
  const tiles = []

  if (patch === 'thin') {
    // A single thin rhomb: two acute halves glued along their short base. The
    // apex is 36 degrees, so the base is 2 sin(18) = 1/phi — an acute tile's
    // base by definition. At any other angle the halves are still a rhomb and
    // still tile, and deflate into shapes that are not Penrose tiles.
    const x = Math.cos(Math.PI / 10)
    const y = Math.sin(Math.PI / 10)
    tiles.push([0, 0, 0, x, y, x, -y], [0, x * 2, 0, x, -y, x, y])
    // Centre and inradius of the rhomb: area / (2 x side), side being 1.
    return { tiles, cx: x, cy: 0, inradius: x * y }
  }

  if (patch === 'rhomb') {
    // A single fat rhomb — two obtuse halves glued along their long base. The
    // patch that grows out of it is off-centre, so the fivefold symmetry shows
    // up locally rather than as a rosette.
    const x = Math.cos(Math.PI * 0.3)
    const y = Math.sin(Math.PI * 0.3)
    tiles.push([1, 0, 0, x, y, x, -y], [1, x * 2, 0, x, -y, x, y])
    return { tiles, cx: x, cy: 0, inradius: x * y }
  }

  // Sun: ten acute tiles meeting at their 36-degree apex.
  for (let i = 0; i < 10; i += 1) {
    const b = ((2 * i - 1) * Math.PI) / 10
    const c = ((2 * i + 1) * Math.PI) / 10
    const bx = Math.cos(b)
    const by = Math.sin(b)
    const cx = Math.cos(c)
    const cy = Math.sin(c)
    // Every other tile is mirrored, so neighbours meet edge to edge.
    if (i % 2 === 0) tiles.push([0, 0, 0, cx, cy, bx, by])
    else tiles.push([0, 0, 0, bx, by, cx, cy])
  }
  // A regular decagon of circumradius 1: its inradius is cos(18 degrees).
  return { tiles, cx: 0, cy: 0, inradius: Math.cos(Math.PI / 10) }
}

/**
 * Triangles back into rhombs.
 *
 * Deflation works in half-rhombs, and drawing those leaves a seam across every
 * tile. The two halves of a rhomb are mirror images sharing a diagonal, so the
 * missing corner is the reflection of the apex through that diagonal's
 * midpoint — which, because a rhomb's diagonals bisect each other, is just
 * `p + r - q`. Each rhomb is found twice, once from each half, so they are
 * keyed by centre and the second is dropped.
 */
function toRhombs(tiles) {
  const seen = new Map()
  for (const [kind, ax, ay, bx, by, cx, cy] of tiles) {
    // The odd side out is the diagonal: the other two are rhomb edges.
    const ab = (ax - bx) ** 2 + (ay - by) ** 2
    const bc = (bx - cx) ** 2 + (by - cy) ** 2
    const ca = (cx - ax) ** 2 + (cy - ay) ** 2
    let px, py, qx, qy, rx, ry
    if (Math.abs(ab - bc) < 1e-9) {
      // |AB| = |BC|, so B is the apex and A-C is the diagonal.
      px = ax; py = ay; qx = bx; qy = by; rx = cx; ry = cy
    } else if (Math.abs(bc - ca) < 1e-9) {
      px = bx; py = by; qx = cx; qy = cy; rx = ax; ry = ay
    } else {
      px = cx; py = cy; qx = ax; qy = ay; rx = bx; ry = by
    }
    const sx = px + rx - qx
    const sy = py + ry - qy

    const midX = (px + rx) / 2
    const midY = (py + ry) / 2
    const key = `${Math.round(midX * 1e6)},${Math.round(midY * 1e6)}`
    if (seen.has(key)) continue
    // Wound P, Q, R, S — apex, edge, opposite apex, edge.
    seen.set(key, { kind, x: midX, y: midY, points: [px, py, qx, qy, rx, ry, sx, sy] })
  }
  return [...seen.values()]
}

export default {
  id: 'penrose',
  name: 'Penrose Tiling',
  blurb: 'Rhombi in fivefold array, never repeating.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    // Large flat areas, so an ink that matches the paper reads as a hole in
    // the tiling rather than as a quiet tile.
    const inks = legibleInks(palette).slice().reverse()

    // The only randomness in the piece: which ink a tile takes when colour is
    // scattered, and the order the inks are assigned to the fivefold classes.
    // Spent up front and at a fixed size, so no dial reshuffles the tiling.
    const scatter = new Float64Array(2048)
    for (let i = 0; i < scatter.length; i += 1) scatter[i] = rng.float()
    const wheel = rng.int(0, inks.length - 1)

    const seed = seedPatch(p.patch)
    let tiles = seed.tiles
    for (let d = 0; d < p.depth; d += 1) {
      if (tiles.length * 2.7 > TILE_BUDGET) break
      tiles = deflate(tiles)
    }

    const rhombs = toRhombs(tiles)

    /**
     * The tiling covers the frame and is cropped, rather than being fitted
     * inside it.
     *
     * Fitted, a patch reads as a doily on a table — an object with an edge,
     * sitting on paper. The point of this one is that it goes on forever
     * without repeating, and a crop says that where a silhouette can't. The
     * scale comes from the seed's inradius because deflation never moves the
     * patch outline: subdividing changes what is inside the region, never the
     * region. Covering the frame's *circumradius* means a spin can't swing a
     * bare corner into view.
     */
    const frameW = width - p.margin * 2
    const frameH = height - p.margin * 2
    const cover = Math.hypot(frameW, frameH) / 2
    const scale = (cover / seed.inradius) * p.zoom
    const spin = (p.spin * Math.PI) / 180
    const cosS = Math.cos(spin)
    const sinS = Math.sin(spin)
    const cx = width / 2
    const cy = height / 2

    const place = (x, y) => {
      const dx = x - seed.cx
      const dy = y - seed.cy
      return [cx + (dx * cosS - dy * sinS) * scale, cy + (dx * sinS + dy * cosS) * scale]
    }

    // Anything that lands well outside the frame is dropped before it is
    // turned into path data: at high zoom that is most of the patch, and an
    // exported SVG shouldn't carry a megabyte of tiles nobody can see.
    const tileReach = (2 / seed.inradius) * scale * 0.2
    const keep = cover + tileReach

    /**
     * Which ink a tile takes.
     *
     * Fivefold is the one worth having: every edge in a Penrose tiling points
     * along one of ten directions, so bucketing a tile's diagonal into five
     * classes colours it by orientation — and the fivefold structure that the
     * geometry only implies becomes something you can see. Measured before the
     * spin, so turning the piece turns the colours with it rather than
     * cycling them.
     */
    const inkFor = (rhomb, index) => {
      let slot
      if (p.tint === 'shape') {
        slot = rhomb.kind === 1 ? 0 : inks.length - 1
      } else if (p.tint === 'fivefold') {
        const angle = Math.atan2(rhomb.points[5] - rhomb.points[1], rhomb.points[4] - rhomb.points[0])
        const turn = ((angle % Math.PI) + Math.PI) % Math.PI
        slot = wheel + Math.floor((turn / Math.PI) * 5)
      } else if (p.tint === 'radius') {
        const t = Math.min(1, Math.hypot(rhomb.x - seed.cx, rhomb.y - seed.cy) / (seed.inradius * 1.6))
        slot = Math.floor(t ** (1 + p.colorBias) * inks.length)
      } else {
        slot = Math.floor(scatter[index % scatter.length] ** (1 + p.colorBias) * inks.length)
      }
      return inks[((slot % inks.length) + inks.length) % inks.length]
    }

    const fills = new Map()
    const edges = []

    const wavePhase = (p.wavePhase * Math.PI) / 180
    const waveTurn = (p.waveTurn * Math.PI) / 180

    rhombs.forEach((rhomb, index) => {
      const pts = rhomb.points
      const [px0, py0] = place(rhomb.x, rhomb.y)
      if (Math.hypot(px0 - cx, py0 - cy) > keep) return

      /**
       * Where this tile sits in the wave, measured in tiling space — before
       * the spin, so turning the piece turns the wave with it rather than
       * dragging the pattern through a ripple that stays put.
       */
      let turn = 0
      let inset = p.inset
      if (p.wave > 0) {
        const dx = rhomb.x - seed.cx
        const dy = rhomb.y - seed.cy
        const along = p.waveForm === 'bands' ? dx : Math.hypot(dx, dy)
        // Cubed, which is the difference between a ripple and confetti. A
        // plain sine disturbs every tile all of the time and the tiling stops
        // reading as a tiling; cubing holds most of them flush and
        // concentrates the movement into a narrow crest that travels through
        // an intact pattern.
        const swell = Math.sin(along * p.waveScale - wavePhase) ** 3
        turn = swell * waveTurn * p.wave
        // The grout opens as a tile turns, so a crest reads as the surface
        // lifting rather than as tiles merely spinning in their sockets.
        inset = Math.min(0.85, inset + Math.abs(swell) * 0.16 * p.wave)
      }
      const cosT = Math.cos(turn)
      const sinT = Math.sin(turn)

      const path = []
      for (let i = 0; i < 8; i += 2) {
        // Pull each corner toward the tile's centre; at 0 the tiles touch.
        let x = (pts[i] - rhomb.x) * (1 - inset)
        let y = (pts[i + 1] - rhomb.y) * (1 - inset)
        if (turn !== 0) {
          const rx = x * cosT - y * sinT
          y = x * sinT + y * cosT
          x = rx
        }
        const [sx, sy] = place(rhomb.x + x, rhomb.y + y)
        path.push(`${i === 0 ? 'M' : 'L'}${r1(sx)},${r1(sy)}`)
      }
      const d = path.join('') + 'Z'

      const ink = inkFor(rhomb, index)
      if (p.fill > 0) {
        const list = fills.get(ink) ?? []
        list.push(d)
        fills.set(ink, list)
      }
      if (p.lineWidth > 0) edges.push(d)

    })

    const shapes = []
    for (const [ink, list] of fills) {
      shapes.push({
        tag: 'path',
        attrs: { d: list.join(''), fill: ink, 'fill-opacity': (p.opacity * p.fill).toFixed(3) },
      })
    }
    if (p.lineWidth > 0) {
      // Edges are grout — paper-coloured lines between filled tiles. With
      // little or no fill there is nothing to grout, so they become the
      // drawing itself and take an ink instead.
      const grout = p.fill >= 0.35
      shapes.push({
        tag: 'path',
        attrs: {
          d: edges.join(''),
          fill: 'none',
          stroke: grout ? palette.bg : inks[0],
          'stroke-width': r1(p.lineWidth),
          'stroke-opacity': p.opacity.toFixed(3),
          'stroke-linejoin': 'round',
        },
      })
    }
    // Clipped to the mat rather than bleeding to the canvas edge, so margin
    // still means what it means everywhere else.
    const clipId = `penrose-${Math.round(width)}x${Math.round(height)}-${Math.round(p.margin)}`
    const framed = [
      {
        tag: 'clipPath',
        attrs: { id: clipId },
        children: [{ tag: 'rect', attrs: { x: r1(p.margin), y: r1(p.margin), width: r1(frameW), height: r1(frameH) } }],
      },
      { tag: 'g', attrs: { 'clip-path': `url(#${clipId})` }, children: shapes },
    ]

    return { width, height, background: palette.bg, shapes: framed }
  },
}
