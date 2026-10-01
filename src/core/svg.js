/**
 * Scene tree to an SVG string, without a DOM.
 *
 * The browser export path serialises the live document, which is simpler and
 * exact. This exists for everywhere there is no document — chiefly the
 * serverless function that renders link previews, where the generators run
 * happily but `XMLSerializer` doesn't exist.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c])

function renderNode(node) {
  const attrs = Object.entries(node.attrs ?? {})
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => ` ${k}="${escape(v)}"`)
    .join('')

  const children = node.children ?? []
  if (!children.length) return `<${node.tag}${attrs}/>`
  return `<${node.tag}${attrs}>${children.map(renderNode).join('')}</${node.tag}>`
}

/**
 * A complete, standalone SVG document for a scene.
 *
 * `width`/`height` are written explicitly as well as the viewBox: renderers
 * that rasterise — Firefox, and resvg — need a concrete size and will refuse
 * or guess without one.
 */
export function renderSvg(scene, { defs = [], artworkFilter = '', overlay = [], frame = null } = {}) {
  const body = [
    ...defs.map(renderNode),
    `<rect x="0" y="0" width="${scene.width}" height="${scene.height}" fill="${escape(scene.background)}"/>`,
    artworkFilter
      ? `<g filter="url(#${escape(artworkFilter)})">${scene.shapes.map(renderNode).join('')}</g>`
      : scene.shapes.map(renderNode).join(''),
    ...overlay.map(renderNode),
  ].join('')

  if (!frame) {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" ` +
      `viewBox="0 0 ${scene.width} ${scene.height}">${body}</svg>`
    )
  }

  /**
   * A framed render places the piece inside a larger canvas.
   *
   * Two jobs, which is why the options look the way they do. Link previews
   * want one card shape whatever ratio the piece is, and letterbox it against
   * the piece's own background so the surround reads as deliberate rather than
   * as a crop — that is what `{ width, height }` alone still does.
   *
   * A mount wants more: its own surround colour, chrome drawn behind and in
   * front of the artwork, and the art placed where the mount says rather than
   * centred. Every one of those is optional and absent means the old
   * behaviour, because `netlify/functions/og.mjs` calls this with two fields
   * and must keep getting the same picture.
   *
   * `clip` in particular defaults OFF. Clipping the art to its own rectangle
   * is right for a mount and wrong for a card: ten of the twenty pieces draw
   * something outside their own bounds — moire most of all — and turning it on
   * by default silently recropped half the link previews.
   */
  const { fill, behind = [], front = [], art = null, clip = false } = frame

  const fit = art ? art.scale : Math.min(frame.width / scene.width, frame.height / scene.height)
  const x = art ? art.x : (frame.width - scene.width * fit) / 2
  const y = art ? art.y : (frame.height - scene.height * fit) / 2

  /**
   * The artwork is clipped to its own rectangle.
   *
   * Bloom, aberration and glitch are given filter regions that reach well past
   * the shapes they filter — `-20%` to `140%`, and glitch displaces up to 140
   * units sideways. On the stage the viewBox edge hides that. Inside a mount
   * there is mat to spill onto, so the art is cut to its own edge, which is
   * where a real print would be cut too.
   */
  const clipId = `art-${Math.round(frame.width)}x${Math.round(frame.height)}`
  const clipDef = clip
    ? `<clipPath id="${clipId}"><rect x="0" y="0" width="${scene.width}" height="${scene.height}"/></clipPath>`
    : ''
  const clipAttr = clip ? ` clip-path="url(#${clipId})"` : ''

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width}" height="${frame.height}" ` +
    `viewBox="0 0 ${frame.width} ${frame.height}">` +
    `<rect x="0" y="0" width="${frame.width}" height="${frame.height}" fill="${escape(fill ?? scene.background)}"/>` +
    behind.map(renderNode).join('') +
    `<g transform="translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(${fit.toFixed(6)})">` +
    clipDef +
    `<g${clipAttr}>${body}</g>` +
    `</g>` +
    front.map(renderNode).join('') +
    `</svg>`
  )
}
