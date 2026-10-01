/**
 * Mounts — a piece as it would be presented, rather than as it is drawn.
 *
 * A mount says what surrounds the artwork and where the artwork sits inside
 * it. Adding a presentation is adding an entry here, the same bargain the
 * generator registry makes: the gallery walks this list and knows nothing
 * about any particular mount.
 *
 * Two kinds, because two kinds are needed.
 *
 * A `vector` mount composes into a standalone SVG document, which the gallery
 * hands to an `<img>` exactly as the opening panel does with its thumbnails —
 * a document of its own, so the clip-path and filter ids a piece mints cannot
 * collide with the same piece rendered beside it.
 *
 * A `photo` mount cannot work that way. An SVG shown in an `<img>` is not
 * allowed to load anything external, so a `<image href="/rooms/...">` inside
 * one renders as a hole; the only way in would be to inline the photograph as
 * a data URI, at hundreds of kilobytes a cell. So a photo mount is composed in
 * HTML instead: the photograph in one `<img>`, the artwork in another on top
 * of it. No inlining, and CSS can place it.
 */

import { lightness } from './palettes.js'

/** `lightness` is 0-255, not 0-1 — the midpoint is 128. */
const isLight = (scene) => lightness(scene.background) > 128

/** A rounded number, because mount geometry does not need sub-pixel precision. */
const r = (n) => Math.round(n * 10) / 10

/**
 * Board colour for the mat.
 *
 * Chosen against the piece rather than fixed: a warm off-white under a light
 * piece and a deep charcoal under a dark one. A white mat around a near-black
 * piece reads as a mistake, and the reverse glows.
 */
function board(scene) {
  return isLight(scene)
    ? { mat: '#f3efe6', line: '#d8d1c2', frame: '#2a2622' }
    : { mat: '#1b1b1f', line: '#2e2e35', frame: '#0b0b0d' }
}

/** A plain filled rectangle node. */
const rect = (x, y, width, height, fill) => ({
  tag: 'rect',
  attrs: { x: r(x), y: r(y), width: r(width), height: r(height), fill },
})

/**
 * Lay the artwork inside a surround of the given thickness.
 *
 * Everything below is this plus chrome: the art keeps its own proportions and
 * the mount grows around it, rather than the art being squeezed to fit a mount.
 */
function inset(scene, pad) {
  return {
    width: scene.width + pad * 2,
    height: scene.height + pad * 2,
    art: { x: pad, y: pad, scale: 1 },
  }
}

export const mounts = [
  {
    id: 'bare',
    name: 'Bare',
    note: 'The piece as drawn.',
    kind: 'vector',
    compose: (scene) => ({
      width: scene.width,
      height: scene.height,
      art: { x: 0, y: 0, scale: 1 },
      clip: true,
    }),
  },

  {
    id: 'mat',
    name: 'Mounted',
    note: 'A wide board, no moulding.',
    kind: 'vector',
    compose: (scene) => {
      const pad = Math.min(scene.width, scene.height) * 0.17
      const box = inset(scene, pad)
      const tone = board(scene)
      return {
        ...box,
        fill: tone.mat,
        clip: true,
        // A hairline where the board is cut away, which is the whole of what
        // tells the eye there is a board at all.
        behind: [rect(pad - 2, pad - 2, scene.width + 4, scene.height + 4, tone.line)],
      }
    },
  },

  {
    id: 'thin',
    name: 'Thin frame',
    note: 'A narrow metal edge.',
    kind: 'vector',
    compose: (scene) => {
      const edge = Math.min(scene.width, scene.height) * 0.014
      const box = inset(scene, edge)
      return {
        ...box,
        fill: board(scene).frame,
        clip: true,
      }
    },
  },

  {
    id: 'gallery',
    name: 'Gallery frame',
    note: 'Board inside a deep frame.',
    kind: 'vector',
    compose: (scene) => {
      const short = Math.min(scene.width, scene.height)
      const mat = short * 0.14
      const moulding = short * 0.035
      const pad = mat + moulding
      const box = inset(scene, pad)
      const tone = board(scene)
      return {
        ...box,
        fill: tone.frame,
        clip: true,
        behind: [
          // The board, sitting inside the moulding.
          rect(moulding, moulding, box.width - moulding * 2, box.height - moulding * 2, tone.mat),
          rect(pad - 2, pad - 2, scene.width + 4, scene.height + 4, tone.line),
        ],
        // A bevel rather than a blurred shadow: two flat rectangles are exact
        // in every renderer, where a Gaussian is only approximated by some.
        front: [
          rect(0, 0, box.width, moulding * 0.28, '#ffffff18'),
          rect(0, box.height - moulding * 0.28, box.width, moulding * 0.28, '#00000030'),
        ],
      }
    },
  },

  {
    id: 'wall',
    name: 'On a wall',
    note: 'Hung, drawn to scale.',
    kind: 'vector',
    compose: (scene) => {
      const short = Math.min(scene.width, scene.height)
      const mat = short * 0.1
      const moulding = short * 0.03
      const pad = mat + moulding
      const framed = { width: scene.width + pad * 2, height: scene.height + pad * 2 }
      const tone = board(scene)

      /**
       * A real wall, in millimetres.
       *
       * `ratios.js` holds area constant and notes that the A-series shape lands
       * on A0 in millimetres, so a piece here has a true size rather than only
       * a pixel size. The wall is 2.4m floor to ceiling with a 100mm skirting,
       * and the frame hangs with its centre at 1500mm — gallery height. That
       * makes this an answer to how big to print rather than decoration.
       */
      const SKIRTING_MM = 100
      const CENTRE_MM = 1500
      const printLongEdgeMm = 594 // A2
      const mmToPx = Math.max(framed.width, framed.height) / printLongEdgeMm

      /**
       * How much wall to show, which is a separate question from how big the
       * piece is.
       *
       * A full 2.4m wall is honest and unreadable — at A2 the print comes out
       * a stamp in the corner and you learn nothing from it. The view is
       * cropped to a 2.6m by 2.1m window instead, floor at the bottom, which
       * keeps the scale true while leaving the work big enough to judge.
       */
      const VIEW_W_MM = 2600
      const VIEW_H_MM = 2100

      const wallPx = VIEW_H_MM * mmToPx
      const width = VIEW_W_MM * mmToPx
      const skirting = SKIRTING_MM * mmToPx
      const centreY = wallPx - CENTRE_MM * mmToPx

      return {
        width: r(width),
        height: r(wallPx),
        fill: isLight(scene) ? '#2c2b31' : '#d9d5cc',
        clip: true,
        art: {
          x: (width - framed.width) / 2 + pad,
          y: centreY - framed.height / 2 + pad,
          scale: 1,
        },
        behind: [
          rect(0, wallPx - skirting, width, skirting, isLight(scene) ? '#3a3940' : '#efece4'),
          rect((width - framed.width) / 2, centreY - framed.height / 2, framed.width, framed.height, tone.frame),
          rect(
            (width - framed.width) / 2 + moulding,
            centreY - framed.height / 2 + moulding,
            framed.width - moulding * 2,
            framed.height - moulding * 2,
            tone.mat,
          ),
        ],
      }
    },
  },

  {
    id: 'ochre',
    name: 'Ochre study',
    note: 'Hung above the bench.',
    kind: 'photo',
    photo: {
      src: '/rooms/ochre-study.jpg',
      width: 1333,
      height: 2000,
      /**
       * Where the artwork lands, in the photograph's own pixels.
       *
       * The wall is square to the camera, so this is a plain rectangle and the
       * placement is a scale and a translate. A wall shot at an angle would
       * need a homography, which CSS can do with `matrix3d` and SVG cannot do
       * at all — worth knowing before gathering more of these.
       */
      area: { x: 430, y: 210, width: 690, height: 660 },
    },
    credit: {
      who: 'Julia',
      profile: 'https://unsplash.com/@beazy?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
      source: 'Unsplash',
      sourceUrl: 'https://unsplash.com/?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    },
    compose: (scene) => {
      // Framed exactly as the gallery mount does, so the two read as the same
      // object seen two ways.
      const short = Math.min(scene.width, scene.height)
      const mat = short * 0.1
      const moulding = short * 0.03
      const pad = mat + moulding
      const box = inset(scene, pad)
      const tone = board(scene)
      return {
        ...box,
        fill: tone.frame,
        clip: true,
        behind: [rect(moulding, moulding, box.width - moulding * 2, box.height - moulding * 2, tone.mat)],
        front: [
          rect(0, 0, box.width, moulding * 0.28, '#ffffff18'),
          rect(0, box.height - moulding * 0.28, box.width, moulding * 0.28, '#00000030'),
        ],
      }
    },
  },
]

export const mountById = Object.fromEntries(mounts.map((m) => [m.id, m]))

/**
 * Where a framed piece sits within a photograph, as CSS pixels of the
 * photo's own coordinate space. Contained, never cropped — a mount that cut
 * the corners off the work would be worse than no mount.
 */
export function placeInPhoto(photo, framedWidth, framedHeight) {
  const { x, y, width, height } = photo.area
  const fit = Math.min(width / framedWidth, height / framedHeight)
  const w = framedWidth * fit
  const h = framedHeight * fit
  return {
    left: (x + (width - w) / 2) / photo.width,
    top: (y + (height - h) / 2) / photo.height,
    width: w / photo.width,
    height: h / photo.height,
  }
}
