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
 * Board and moulding colours, chosen against the piece rather than fixed.
 *
 * A white mat around a near-black piece reads as a mistake, and the reverse
 * glows.
 */
function board(scene) {
  return isLight(scene)
    ? { mat: '#f3efe6', line: '#d8d1c2', frame: '#2a2622' }
    : { mat: '#1b1b1f', line: '#2e2e35', frame: '#0b0b0d' }
}

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
 * A bevel, as two flat rectangles.
 *
 * Not a blurred shadow: a Gaussian is exact in a browser and only approximated
 * by other renderers, where two rectangles are the same everywhere.
 */
const bevel = (width, height, depth) => [
  rect(0, 0, width, depth, '#ffffff18'),
  rect(0, height - depth, width, depth, '#00000030'),
]

/**
 * Four framings — enough to decide by, few enough to flick through.
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
      const tone = board(scene)
      return {
        ...box,
        fill: tone.mat,
        clip: true,
        // The hairline where the board is cut away is the whole of what tells
        // the eye there is a board at all.
        behind: [rect(pad - 2, pad - 2, scene.width + 4, scene.height + 4, tone.line)],
      }
    },
  },

  {
    id: 'gallery',
    name: 'Gallery',
    compose: (scene) => {
      const short = Math.min(scene.width, scene.height)
      const mat = short * 0.12
      const moulding = short * 0.035
      const pad = mat + moulding
      const box = inset(scene, pad)
      const tone = board(scene)
      return {
        ...box,
        fill: tone.frame,
        clip: true,
        behind: [
          rect(moulding, moulding, box.width - moulding * 2, box.height - moulding * 2, tone.mat),
          rect(pad - 2, pad - 2, scene.width + 4, scene.height + 4, tone.line),
        ],
        front: bevel(box.width, box.height, moulding * 0.28),
      }
    },
  },
]

export const frameById = Object.fromEntries(frames.map((f) => [f.id, f]))
export const DEFAULT_FRAME = 'mat'

/**
 * Rooms the work can hang in.
 *
 * `area` is where the artwork lands, in the photograph's own pixels. These
 * walls are square to the camera, so placement is a scale and a translate. A
 * wall shot at an angle would need a homography, which CSS can do with
 * `matrix3d` and SVG cannot do at all — worth knowing before gathering more.
 *
 * `light` is where the light comes from, as a direction the shadow falls in,
 * and `wall` is the colour of the surface. Both are measured from the
 * photograph rather than guessed: in this one the wall reads 195.6 to the left
 * of the hanging area against 174.9 to the right, and the framed poster
 * already in the shot has wall at #b7a88b on its left and #4b3e1a on its
 * right. Light from the upper left, shadow down and to the right.
 *
 * `credit` travels with the photograph rather than living on the page, so a
 * room cannot be added without its attribution.
 */
export const rooms = [
  {
    id: 'ochre',
    name: 'Ochre study',
    src: '/rooms/ochre-study.jpg',
    width: 1333,
    height: 2000,
    area: { x: 430, y: 210, width: 690, height: 660 },
    light: { x: 1, y: 0.62 },
    wall: '#e1b96d',
    credit: {
      who: 'Julia',
      profile: 'https://unsplash.com/@beazy?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
      source: 'Unsplash',
      sourceUrl: 'https://unsplash.com/?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    },
  },
]

/**
 * Where a framed piece sits within a room, as fractions of the photograph.
 *
 * Fractions rather than pixels, so the placement holds at whatever size the
 * photograph is displayed. Contained, never cropped — a room that cut the
 * corners off the work would be worse than no room.
 */
export function placeInRoom(room, framedWidth, framedHeight) {
  const { x, y, width, height } = room.area
  const fit = Math.min(width / framedWidth, height / framedHeight)
  const w = framedWidth * fit
  const h = framedHeight * fit
  return {
    left: (x + (width - w) / 2) / room.width,
    top: (y + (height - h) / 2) / room.height,
    width: w / room.width,
    height: h / room.height,
  }
}

/**
 * What makes a pasted rectangle look like an object on a wall.
 *
 * Three things, none of them large. A shadow in two parts — a wide soft one
 * for the room's ambient light and a tight dark one where the frame meets the
 * plaster, which is the part the eye actually reads as contact. A sheen across
 * the glass, angled against the light rather than arbitrarily. And a breath of
 * the wall's own colour over the work, because a print in a room is lit by
 * that room and a perfectly neutral rectangle sits on top of the photograph
 * rather than in it.
 *
 * Sized in container-query units so the whole thing scales with the
 * photograph: the piece is placed as a percentage, and a shadow measured in
 * pixels would be wrong at every size but one.
 */
export function hangStyle(room) {
  const { x, y } = room.light ?? { x: 1, y: 0.6 }
  const o = (n) => `${(n).toFixed(2)}cqw`
  return {
    shadow:
      `${o(x * 1.3)} ${o(y * 1.3)} ${o(2.8)} rgb(0 0 0 / 30%), ` +
      `${o(x * 0.3)} ${o(y * 0.3)} ${o(0.55)} rgb(0 0 0 / 42%)`,
    // Across the face, from the lit corner toward the shaded one.
    sheen:
      `linear-gradient(${(Math.atan2(x, y) * 180) / Math.PI + 90}deg, ` +
      `rgb(255 255 255 / 13%) 0%, rgb(255 255 255 / 4%) 34%, rgb(255 255 255 / 0%) 62%)`,
    wall: room.wall ?? '#808080',
  }
}
