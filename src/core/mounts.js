/**
 * Presentation — how a piece is framed, and where it is hung.
 *
 * Two lists, because they are two independent choices. A **frame** is what
 * surrounds the artwork: a board, a moulding, nothing. A **room** is a
 * photograph of somewhere the framed piece can stand. Every frame can appear
 * in every room, so adding either one multiplies rather than adds.
 *
 * The framed piece is composed as a standalone SVG document and handed to an
 * `<img>`, the same choice the opening panel makes for its thumbnails, and for
 * the same reason twice over. A piece mints clip-path and filter ids from its
 * own seed, so two framings of one piece inlined together would collide; and
 * the stage is left alone, which matters because export serialises the live
 * stage node.
 *
 * The room cannot be part of that document. An SVG shown in an `<img>` may not
 * load anything external, so a `<image href="/rooms/...">` inside one renders
 * as a hole, and the only way in would be to carry the whole photograph as a
 * data URI. So the room is a plain `<img>` and the framed piece is laid over
 * it in HTML.
 */

import { lightness } from './palettes.js'

/** `lightness` is 0-255, not 0-1 — the midpoint is 128. */
const isLight = (scene) => lightness(scene.background) > 128

/** A rounded number, because frame geometry does not need sub-pixel precision. */
const r = (n) => Math.round(n * 10) / 10

/**
 * Moulding colours, chosen against the piece rather than fixed.
 *
 * Only what surrounds the mount is the piece's business: a near-black frame
 * against a dark work, a softer dark against a light one, and timber that goes
 * the other way from the piece so it contrasts either direction — pale oak on
 * a dark print, walnut on a light one.
 */
function board(scene) {
  return isLight(scene)
    ? { frame: '#2a2622', wood: '#6a4530' }
    : { frame: '#0a0a0c', wood: '#c08f55' }
}

/**
 * The mount, which is white paper whatever the piece.
 *
 * It used to be cut to suit the work — a charcoal board for a dark piece, on
 * the reasoning that white around a near-black print reads as a mistake. That
 * is the wrong way round: white paper is what a framer actually cuts, and a
 * dark print on white is the most ordinary thing hanging in any gallery.
 *
 * `line` is darker than the board because a bevel cut through white paper
 * shows its own shadow. That cut is the detail that says board rather than
 * border, and it is the only thing distinguishing a mount from a wide margin.
 */
const MOUNT = { mat: '#f2efe8', line: '#d9d3c6' }

/**
 * A colour moved toward white or black by a fraction.
 *
 * A fraction rather than a multiplier, because a multiplier does nothing to a
 * near-black: #0a0a0c times 1.2 is #0c0c0e, which is the same colour. Mixed a
 * sixth of the way to white it is #39393b, which is a lit facet.
 */
function lift(hex, t) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const to = t >= 0 ? 255 : 0
  const a = Math.abs(t)
  const part = (i) => {
    const v = parseInt(full.slice(i, i + 2), 16)
    return Math.round(v + (to - v) * a).toString(16).padStart(2, '0')
  }
  return `#${part(0)}${part(2)}${part(4)}`
}

/**
 * A moulding as four mitred rails.
 *
 * This is what separates a frame from a mat, and it has to be structural
 * rather than a matter of colour. Mounted and Gallery used to differ only in
 * tone, so on a dark piece — where the mat and the moulding were both near
 * black, sixteen levels apart out of 255 — switching between them changed
 * nothing you could see. Four rails meeting at 45 degrees, each catching the
 * light on a different face, reads as a joined frame at any tone.
 *
 * Lit from the upper left, which is the convention for a drawn object and is
 * deliberately gentle: the room's own light is applied over the top of this,
 * per room, by `hangStyle`.
 */
function mitre(width, height, depth, colour) {
  const w = r(width)
  const h = r(height)
  const d = r(depth)
  const rail = (points, t) => ({ tag: 'polygon', attrs: { points, fill: lift(colour, t) } })
  return [
    rail(`0,0 ${w},0 ${w - d},${d} ${d},${d}`, 0.17),
    rail(`0,0 ${d},${d} ${d},${h - d} 0,${h}`, 0.06),
    rail(`${w},0 ${w},${h} ${w - d},${h - d} ${w - d},${d}`, -0.1),
    rail(`0,${h} ${d},${h - d} ${w - d},${h - d} ${w},${h}`, -0.2),
  ]
}

/** The lip where a moulding meets the mat — a real frame has a step there. */
const fillet = (x, y, width, height, stroke, weight) => ({
  tag: 'rect',
  attrs: {
    x: r(x),
    y: r(y),
    width: r(width),
    height: r(height),
    fill: 'none',
    stroke,
    'stroke-width': r(weight),
  },
})

const rect = (x, y, width, height, fill) => ({
  tag: 'rect',
  attrs: { x: r(x), y: r(y), width: r(width), height: r(height), fill },
})

/**
 * Lay the artwork inside a surround of the given thickness.
 *
 * The art keeps its proportions and the frame grows around it, rather than the
 * art being squeezed to fit a frame.
 */
function inset(scene, pad) {
  return {
    width: scene.width + pad * 2,
    height: scene.height + pad * 2,
    art: { x: pad, y: pad, scale: 1 },
  }
}

/**
 * Five framings — enough to decide by, few enough to flick through.
 *
 * `clip` is on throughout. Bloom, aberration and glitch are given filter
 * regions reaching well past the shapes they filter, and a frame gives them
 * mat to bleed onto where the stage's own edge used to hide it. Measured in a
 * browser, an unclipped mat had 11,523 pixels contaminated; clipped, none.
 */
export const frames = [
  {
    id: 'none',
    name: 'Unframed',
    compose: (scene) => ({
      width: scene.width,
      height: scene.height,
      art: { x: 0, y: 0, scale: 1 },
      clip: true,
    }),
  },

  {
    id: 'thin',
    name: 'Thin',
    compose: (scene) => {
      const edge = Math.min(scene.width, scene.height) * 0.016
      return { ...inset(scene, edge), fill: board(scene).frame, clip: true }
    },
  },

  {
    id: 'mat',
    name: 'Mounted',
    compose: (scene) => {
      const pad = Math.min(scene.width, scene.height) * 0.15
      const box = inset(scene, pad)
      return {
        ...box,
        fill: MOUNT.mat,
        clip: true,
        // The hairline where the board is cut away is the whole of what tells
        // the eye there is a board at all.
        behind: [rect(pad - 2, pad - 2, scene.width + 4, scene.height + 4, MOUNT.line)],
      }
    },
  },

  {
    id: 'gallery',
    name: 'Gallery',
    compose: (scene) => framed(scene, { mat: 0.115, moulding: 0.042, colour: board(scene).frame }),
  },

  {
    id: 'wood',
    name: 'Wood',
    // No mount. Timber goes straight onto the print, the way Thin does — a
    // wooden frame is the frame, not a board with a surround around it.
    compose: (scene) =>
      framed(scene, {
        moulding: 0.05,
        colour: board(scene).wood,
        // The rebate, where the moulding steps down onto the print. It is the
        // line a wooden frame catches the light on, and with no mat to give
        // the frame an inner edge it is doing that job here too.
        lip: 0.2,
      }),
  },
]

/**
 * A mitred moulding, optionally around a mat.
 *
 * `mat` and `moulding` are fractions of the piece's short edge, so a frame is
 * the same object whatever the piece's proportions. Without a mat the moulding
 * sits straight on the print, which is a different object and not a thinner
 * version of the same one.
 */
function framed(scene, { mat = 0, moulding, colour, lip = 0, mount = MOUNT }) {
  const short = Math.min(scene.width, scene.height)
  const band = short * moulding
  const pad = short * mat + band
  const box = inset(scene, pad)
  const tone = mount
  const weight = band * lip

  return {
    ...box,
    fill: colour,
    clip: true,
    // A board, and the hairline where it is cut. Neither exists without a mat:
    // the board would land exactly where the print does, and there is no cut.
    behind: mat
      ? [
          rect(band, band, box.width - band * 2, box.height - band * 2, tone.mat),
          rect(pad - 2, pad - 2, scene.width + 4, scene.height + 4, tone.line),
        ]
      : [],
    front: [
      ...mitre(box.width, box.height, band, colour),
      // Laid along the inside edge of the moulding rather than straddling it,
      // so with no mat it stays on the frame instead of drawing a border onto
      // the artwork.
      ...(lip
        ? [
            fillet(
              band - weight / 2,
              band - weight / 2,
              box.width - band * 2 + weight,
              box.height - band * 2 + weight,
              lift(colour, 0.3),
              weight,
            ),
          ]
        : []),
    ],
  }
}

export const frameById = Object.fromEntries(frames.map((f) => [f.id, f]))
export const DEFAULT_FRAME = 'mat'

/**
 * A frame id from outside — a permalink, a hand-edited URL — made safe.
 *
 * Same contract as coerceGrain and coerceTreatment: anything unrecognised
 * becomes the default rather than undefined, because a link that says to hang
 * the piece should hang it even when it names a frame that no longer exists.
 * Renaming or retiring a frame therefore ages links gracefully instead of
 * breaking them.
 */
export function coerceFrame(id) {
  return frameById[id] ? id : DEFAULT_FRAME
}

/**
 * Rooms the work can hang in.
 *
 * `area` is the clean wall the artwork is centred on, in the photograph's own
 * pixels, and `scale` nudges how much of it the piece takes. These rooms are
 * not shot from the same distance, so a piece sized to its own photograph
 * comes out looking like a different print in each. The ochre study is the
 * baseline at 1; the linen wall is a closer shot and takes 1.2. The plank wall
 * is closer again but reads larger than either at the same number, because its
 * boards run the full width behind the work and give the eye a repeating
 * measure the plaster rooms don't — so it comes down a tenth, to 1.08.
 *
 * These walls are square to the camera, so placement is a scale and a
 * translate. A wall shot at an angle would need a homography, which CSS can do
 * with `matrix3d` and SVG cannot do at all — worth knowing before gathering
 * more.
 *
 * `light` is where the light comes from, as a direction the shadow falls in,
 * and `wall` is the colour of the surface. Both are measured from the
 * photograph rather than guessed: in this one the wall reads 185.3 across its
 * left quarter against 175.9 across its right, so the light is to the left,
 * while top and bottom come out level at 182.0 and 182.3 — so the shadow runs
 * sideways with only a little fall.
 *
 * `credit` travels with the photograph rather than living on the page, so a
 * room cannot be added without its attribution.
 */
export const rooms = [
  {
    id: 'ochre',
    name: 'Ochre study',
    src: '/rooms/ochre-study.jpg',
    width: 1600,
    height: 1933,
    // The clean wall runs x 364-1312, y 176-1072, found by scanning the
    // photograph for the longest unbroken run of wall colour in each row
    // rather than by eye. The hanging area is inset inside that.
    scale: 1,
    area: { x: 450, y: 250, width: 780, height: 740 },
    light: { x: 1, y: 0.5 },
    wall: '#e8c178',
    credit: {
      who: 'Julia',
      profile: 'https://unsplash.com/@beazy?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
      source: 'Unsplash',
      sourceUrl: 'https://unsplash.com/?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    },
  },

  {
    id: 'linen',
    name: 'Linen wall',
    src: '/rooms/linen-wall.jpg',
    width: 1600,
    height: 2000,
    // Clean wall x 356-1252, reaching the top of the frame.
    scale: 1.2,
    area: { x: 430, y: 160, width: 760, height: 780 },
    /**
     * The bright curtain on the right is a window, and it is not what lights
     * this wall. Measured, the wall darkens left to right at every height —
     * 205.8 beside the chair against 194.3 clear of it, 171.6 against 153.9
     * either side of the plant, 222.3 across the left quarter against 207.6
     * across the right. Light from the left, as in the ochre room, but with a
     * shallower fall: top to bottom moves only 217.8 to 212.0.
     */
    light: { x: 1, y: 0.35 },
    wall: '#d8dadc',
    credit: {
      who: 'Lassi',
      profile: 'https://unsplash.com/@lassiveh?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
      source: 'Unsplash',
      sourceUrl: 'https://unsplash.com/?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    },
  },
  {
    id: 'plank',
    name: 'Plank wall',
    src: '/rooms/plank-wall.jpg',
    width: 1600,
    height: 2400,
    // Reclaimed boards, so the usual scan for a run of wall colour finds the
    // stain rather than the obstructions. The blockers were found by colour
    // family instead: the wall is red-dominant everywhere, the chair and the
    // tiles read blue, the plant reads green. That leaves the upper two
    // thirds clear, the chair arriving at y 1463 and the floor at 2236.
    scale: 1.08,
    area: { x: 480, y: 330, width: 790, height: 850 },
    /**
     * Light from the right here, which neither other room does.
     *
     * The wall brightens left to right at every height — 73.5 against 79.8
     * across the halves, 63.7 against 76.4 across the far quarters — and two
     * objects agree: the floor runs 161.3 to 172.2 and the matte vessel is
     * 55.8 on its left against 64.3 on its right. The chair dissents, reading
     * 20.2 left against 11.0 right, but it is a dark gloss shell and that is a
     * specular highlight, not shading. Three diffuse surfaces outvote it.
     *
     * The wall also brightens downward, 71.8 to 77.7, which is bounce off
     * those pale tiles rather than a light under the floor, so the fall stays
     * shallow and downward as in the other rooms.
     */
    light: { x: -1, y: 0.4 },
    wall: '#6e4818',
    credit: {
      who: 'Ariel',
      profile: 'https://unsplash.com/@hypvisual?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
      source: 'Unsplash',
      sourceUrl: 'https://unsplash.com/?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    },
  },
  /**
   * The first wall not square to the camera, and the first that needs more
   * than a scale and a translate.
   *
   * `plane` is the homography from the wall's own coordinates to fractions of
   * the photograph, and it was measured rather than eyeballed. The acoustic
   * slats are evenly spaced on the wall, so their image positions fit the
   * projective map x(u) = (au + b)/(cu + 1) exactly — 45 of them, to a mean of
   * 0.86px — and that map is the wall's perspective. The panel's top edge
   * gives the second row, and the ceiling's junction with the perpendicular
   * left-hand wall gives a second vanishing point, which gives the focal
   * length (2153px, 1.62x the frame) and so the foreshortening: this wall is
   * 40.3 degrees off the image plane, and one unit of height is 55 slats of
   * width.
   *
   * Two things fell out that are worth keeping. Verticals stay vertical here,
   * so the vertical scale at any point is simply its distance from the
   * horizon — and the model is a true homography only when the horizon equals
   * y at the vanishing point, which the slat fit and the top edge agree on
   * independently. That agreement is the check that the whole thing is sound.
   *
   * `wall` is the usable rectangle in those coordinates: u in slats, v
   * downward from the panel's top edge. v = 44 still clears the sofa.
   */
  {
    id: 'slat',
    name: 'Slatted wall',
    src: '/rooms/slat-wall.jpg',
    width: 1333,
    height: 1999,
    plane: [
      [0.0060646018, 0, 0.40218464],
      [-0.0044142595, 0.0077535867, 0.20703443],
      [-0.0069666883, 0, 1],
    ],
    wall: { u0: 8, u1: 38, v0: 6, v1: 44 },
    // The window is off to the left and the wall says so: 89.2 across its left
    // third against 64.7 across its right. The sofa agrees far more loudly,
    // 158.8 on its left against 112.8 on its right.
    light: { x: 1, y: 0.25 },
    wallColour: '#5d5146',
    credit: {
      who: 'Tile Merchant Ireland',
      profile: 'https://unsplash.com/@tilemerchant?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
      source: 'Unsplash',
      sourceUrl: 'https://unsplash.com/?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    },
  },
  /**
   * Patinated steel, and the first wall measured without a grid on it.
   *
   * The slatted wall handed over its perspective in the slats. This one has
   * nothing repeating, so the plane was assembled from what it does have.
   *
   * The panel seam holds x 590-598 over 1200px of height, so the camera is
   * level and verticals stay vertical. The wall's base line fits to a mean of
   * 5.6px across the frame once the sunlight on the floor is excluded from the
   * search. And the horizon came from that sunlight: the streak's two edges are
   * parallel lines on the floor, so they converge on the horizon, and its
   * width grows in proportion to the distance below the horizon. Both put it at
   * y 947, independently.
   *
   * One thing is assumed rather than measured. Foreshortening needs a focal
   * length, which needs a second vanishing point, and the perpendicular wall's
   * base is behind the plant. So it takes the slatted wall's measured 1.6x
   * frame width — an ordinary interior focal length — giving 51 degrees off the
   * image plane and a camera 0.81 panel widths up, which is about 1.05m if a
   * panel is 1.3m. That is a sane room, and the render is the check.
   *
   * `wall` counts `v` *upward* from the floor here, where the slatted wall
   * counts down from its ceiling. Both are natural given what each photograph
   * offers to measure from, which is why placeOnPlane orders its corners by
   * where they land rather than by the order it made them.
   */
  {
    id: 'steel',
    name: 'Steel wall',
    src: '/rooms/steel-wall.jpg',
    width: 1333,
    height: 2000,
    plane: [
      [0.48675141, 0, 0.4456114],
      [0.092350541, -0.42603526, 0.8185075],
      [0.1950381, 0, 1],
    ],
    // Hung clear of eye level rather than straddling it. The horizon sits at
    // v 0.81 and a piece crossing it has one edge tilting each way, which is
    // correct and still reads as a lean rather than as a plane.
    wall: { u0: -0.55, u1: 0.65, v0: 0.88, v1: 1.56 },
    // The window is off to the right and two surfaces standing clear of the
    // wall agree: the pot reads 50.5 on its left against 89.6 on its right,
    // the floor 107.3 against 144.7. The wall itself reads the other way,
    // 83.3 to 58.6, but it is turning away from the camera as it goes — which
    // is exactly the confound an angled wall introduces.
    light: { x: -1, y: 0.3 },
    wallColour: '#4e463d',
    credit: {
      who: 'Declan Sun',
      profile: 'https://unsplash.com/@declansun?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
      source: 'Unsplash',
      sourceUrl: 'https://unsplash.com/?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    },
  },
]

/**
 * The shape every plate is shown in: the shortest photograph's proportions.
 *
 * The rooms were not shot to a common ratio — 1600x1933 against 1600x2400 —
 * so a grid of them came out ragged. They are cropped to match rather than
 * squeezed, and to the shortest so the crop only ever removes.
 *
 * Derived rather than written down, so a room added tomorrow either fits this
 * shape or changes it, and cannot quietly be the one that does not match.
 */
export const PLATE_ASPECT = Math.max(...rooms.map((room) => room.width / room.height))

/**
 * Where a framed piece sits within a room, as fractions of the photograph.
 *
 * Fractions rather than pixels, so the placement holds at whatever size the
 * photograph is displayed. Contained, never cropped — a room that cut the
 * corners off the work would be worse than no room.
 */
export function placeInRoom(room, framedWidth, framedHeight) {
  const { x, y, width, height } = room.area
  const fit = Math.min(width / framedWidth, height / framedHeight) * (room.scale ?? 1)
  const w = framedWidth * fit
  const h = framedHeight * fit
  return {
    left: (x + (width - w) / 2) / room.width,
    top: (y + (height - h) / 2) / room.height,
    width: w / room.width,
    height: h / room.height,
  }
}

/** A point in wall coordinates, as a fraction of the photograph. */
function project(plane, u, v) {
  const w = plane[2][0] * u + plane[2][1] * v + plane[2][2]
  return [
    (plane[0][0] * u + plane[0][1] * v + plane[0][2]) / w,
    (plane[1][0] * u + plane[1][1] * v + plane[1][2]) / w,
  ]
}

/**
 * The four corners a framed piece occupies on an angled wall, as fractions of
 * the photograph.
 *
 * The wall's coordinates are isotropic — one unit across is one unit down in
 * real proportions — so a piece keeps its aspect simply by being a rectangle
 * in them, and the homography does the foreshortening. Fitted inside the
 * usable wall and centred there, the same way a flat room fits its area.
 */
export function placeOnPlane(room, framedWidth, framedHeight) {
  const { u0, u1, v0, v1 } = room.wall
  const spanU = u1 - u0
  const spanV = v1 - v0
  let du = spanU
  let dv = (du * framedHeight) / framedWidth
  if (dv > spanV) { dv = spanV; du = (dv * framedWidth) / framedHeight }
  const u = u0 + (spanU - du) / 2
  const v = v0 + (spanV - dv) / 2
  const corners = [[u, v], [u + du, v], [u + du, v + dv], [u, v + dv]].map(([a, b]) =>
    project(room.plane, a, b),
  )

  // Ordered by where they land rather than by the order they were generated.
  // A wall's `v` may count upward from the floor or downward from a ceiling —
  // both are natural depending on what the photograph gives you to measure
  // from — and the transform needs top-left, top-right, bottom-right,
  // bottom-left regardless. Taken positionally the two conventions differ by a
  // vertical flip, which would hang the work upside down.
  const byX = [...corners].sort((p, r) => p[0] - r[0])
  const [leftTop, leftFoot] = byX.slice(0, 2).sort((p, r) => p[1] - r[1])
  const [rightTop, rightFoot] = byX.slice(2).sort((p, r) => p[1] - r[1])
  return [leftTop, rightTop, rightFoot, leftFoot]
}

/**
 * A CSS matrix3d mapping an element's own box onto four points.
 *
 * Heckbert's unit-square-to-quad, composed with 1/w and 1/h so the element
 * keeps its natural size and the transform does all the work. `matrix3d` is
 * column-major, and the element needs `transform-origin: 0 0`.
 *
 * This is the one thing CSS can do here that SVG cannot: SVG transforms are
 * affine, and an angled wall needs a true homography.
 */
export function matrix3dFor(quad, w, h) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad
  const sx = x0 - x1 + x2 - x3
  const sy = y0 - y1 + y2 - y3
  let a, b, c, d, e, f, g, i

  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) {
    // Square to parallelogram — no perspective term.
    a = x1 - x0; b = x2 - x1; c = x0
    d = y1 - y0; e = y2 - y1; f = y0
    g = 0; i = 0
  } else {
    const dx1 = x1 - x2, dx2 = x3 - x2
    const dy1 = y1 - y2, dy2 = y3 - y2
    const den = dx1 * dy2 - dx2 * dy1
    g = (sx * dy2 - dx2 * sy) / den
    i = (dx1 * sy - sx * dy1) / den
    a = x1 - x0 + g * x1; b = x3 - x0 + i * x3; c = x0
    d = y1 - y0 + g * y1; e = y3 - y0 + i * y3; f = y0
  }

  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, i / h, 0, 0, 1, 0, c, f, 0, 1]
  return `matrix3d(${m.map((n) => +n.toFixed(6)).join(',')})`
}

/**
 * The colour of a room's wall.
 *
 * Its own function because the fallback is a trap: a flat room keeps its
 * colour on `wall`, but an angled room needs that name for the usable
 * rectangle in wall coordinates and carries the colour on `wallColour`. Read
 * `room.wall` directly and the slatted wall hands back an object.
 */
export const wallTone = (room) => room.wallColour ?? (typeof room.wall === 'string' ? room.wall : null) ?? '#808080'

/**
 * What makes a pasted rectangle look like an object on a wall.
 *
 * A shadow puts it in front of the plaster. These put light on it, which is
 * the part that was missing — a frame with no lit edge reads as a printed
 * rectangle however well it is placed.
 *
 * `toward` is the CSS gradient angle pointing the way the shadow falls. CSS
 * measures from "to top" clockwise, and screen y runs downward, which is why
 * it is atan2(x, -y) rather than anything more obvious.
 */
export function hangStyle(room, boost = 1) {
  const { x, y } = room.light ?? { x: 1, y: 0.5 }
  const len = Math.hypot(x, y) || 1
  const u = { x: x / len, y: y / len }
  // `boost` is for a piece on an angled wall. It is drawn at its own size and
  // then transformed down onto the quad, so every length inside it shrinks by
  // that factor — including the shadow, which has to be grown to compensate.
  const o = (n) => `${(n * boost).toFixed(2)}cqw`
  const toward = (Math.atan2(u.x, -u.y) * 180) / Math.PI
  const a = toward.toFixed(1)
  // A reflection stands upright whatever the light's elevation, so this one
  // takes only the side from the light — mirrored, not rotated.
  const pane = u.x >= 0 ? 97 : 263

  return {
    /**
     * Two shadows. A wide soft one for the room's ambient light, and a tight
     * dark one where the frame meets the plaster — that second is the part the
     * eye reads as contact rather than as a glow.
     */
    shadow:
      `${o(u.x * 1.3)} ${o(u.y * 1.3)} ${o(2.8)} rgb(0 0 0 / 30%), ` +
      `${o(u.x * 0.3)} ${o(u.y * 0.3)} ${o(0.55)} rgb(0 0 0 / 42%)`,

    /**
     * The lit edge, and the dark one opposite.
     *
     * An inset shadow offset toward the light leaves its band on the lit side,
     * which is what a moulding catching the light actually looks like: a bright
     * hairline on two sides and a dark one on the other two. Thin on purpose —
     * past about a third of a percent it stops being an edge and starts being
     * a border.
     */
    edge:
      `inset ${o(u.x * 0.22)} ${o(u.y * 0.22)} 0 rgb(255 255 255 / 22%), ` +
      `inset ${o(-u.x * 0.22)} ${o(-u.y * 0.22)} 0 rgb(0 0 0 / 20%)`,

    /**
     * Two gradients in one layer.
     *
     * A sheen off the glass, narrow and placed on the lit corner rather than
     * washed across the whole face — glass gives a defined reflection, not a
     * haze. And an ambient falloff running the way the room's own light falls,
     * so the far side of the piece sits in the same gradient the wall behind it
     * is in. The falloff is the quieter of the two and does the more work.
     *
     * Both run at `toward`, not opposed, because CSS puts a gradient's 0% stop
     * at the *start* of the line rather than where the angle points — the way
     * `linear-gradient(90deg, red, blue)` is red on the left. One angle puts
     * the highlight on the lit side and the shade on the far side, which is
     * one ramp across the piece and not two fighting.
     */
    sheen:
      `linear-gradient(${a}deg, ` +
      `rgb(255 255 255 / 13%) 0%, rgb(255 255 255 / 4%) 12%, rgb(255 255 255 / 0%) 34%), ` +
      `linear-gradient(${a}deg, ` +
      `rgb(0 0 0 / 0%) 35%, rgb(0 0 0 / 9%) 100%)`,

    /**
     * What the glass is reflecting.
     *
     * The sheen above is the light itself falling across the piece; this is the
     * room coming back out of the glazing, and it is the layer that lands on
     * the artwork rather than around it. Glass reflects *things*, so it wants
     * an edge: two soft upright bands on the window side, wide one and narrow
     * one, which is what a window with a mullion leaves on a framed print.
     *
     * Upright, so the gradient runs across the piece — `${pane}deg` is a few
     * degrees off horizontal, and the lean is what stops it reading as a
     * stripe someone drew on. Low percentages put both bands on the lit side,
     * by the same rule the sheen uses.
     */
    glaze:
      `linear-gradient(${pane}deg, ` +
      `rgb(255 255 255 / 0%) 1%, rgb(255 255 255 / 18%) 8%, rgb(255 255 255 / 12%) 16%, ` +
      `rgb(255 255 255 / 0%) 22%, rgb(255 255 255 / 0%) 29%, rgb(255 255 255 / 9%) 34%, ` +
      `rgb(255 255 255 / 4%) 39%, rgb(255 255 255 / 0%) 46%)`,

    /**
     * The print sitting behind the opening rather than flush in it.
     *
     * A mounted print is a few millimetres back, so the mat's inner edge
     * shadows a strip of it — and that strip is on the *lit* side, not the
     * dark one, because what blocks the light is the near wall of a recess.
     * Getting this backwards is the kind of thing that reads as wrong without
     * being identifiable, so: same sign as the shadow direction, which is what
     * puts an inset band on the side the light comes from.
     *
     * The second shadow is the contact line all the way round, which is what
     * says the edge of the paper is an edge.
     */
    recess:
      `inset ${o(u.x * 0.3)} ${o(u.y * 0.3)} ${o(0.5)} rgb(0 0 0 / 24%), ` +
      `inset 0 0 ${o(0.3)} rgb(0 0 0 / 12%)`,

    wall: wallTone(room),
  }
}

/**
 * The artwork's own rectangle inside its frame, in percentages.
 *
 * Every frame reports where it laid the art down, so the glazing treatments
 * can be put on the print itself rather than on the whole mounted object.
 */
export function artWindow(box, scene) {
  const { x, y, scale } = box.art ?? { x: 0, y: 0, scale: 1 }
  return {
    left: `${(x / box.width) * 100}%`,
    top: `${(y / box.height) * 100}%`,
    width: `${((scene.width * scale) / box.width) * 100}%`,
    height: `${((scene.height * scale) / box.height) * 100}%`,
  }
}
