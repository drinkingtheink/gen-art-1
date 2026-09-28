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
export function renderSvg(scene, { defs = [], artworkFilter = '', overlay = [] } = {}) {
  const body = [
    ...defs.map(renderNode),
    `<rect x="0" y="0" width="${scene.width}" height="${scene.height}" fill="${escape(scene.background)}"/>`,
    artworkFilter
      ? `<g filter="url(#${escape(artworkFilter)})">${scene.shapes.map(renderNode).join('')}</g>`
      : scene.shapes.map(renderNode).join(''),
    ...overlay.map(renderNode),
  ].join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" ` +
    `viewBox="0 0 ${scene.width} ${scene.height}">${body}</svg>`
  )
}
