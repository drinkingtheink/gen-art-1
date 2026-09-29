/**
 * Getting the work out.
 *
 * The stage is already real vector, so SVG export is mostly a matter of
 * removing the things the app added: Vue's scoped-style attributes and the
 * layout classes. What's left is a self-contained file that opens anywhere —
 * Illustrator, Inkscape, or a pen plotter, which reads SVG natively.
 */

/** Browsers vary, but canvases much past this get unreliable and memory-hungry. */
const MAX_RASTER_EDGE = 8192

/**
 * A copy of the live stage, cleaned of anything app-specific and given an
 * explicit size. Firefox in particular won't rasterise an SVG without one.
 */
export function serializeScene(svgEl) {
  const clone = svgEl.cloneNode(true)

  clone.removeAttribute('class')
  clone.removeAttribute('style')

  for (const el of [clone, ...clone.querySelectorAll('*')]) {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('data-v-')) el.removeAttribute(attr.name)
    }
  }

  const [, , vbWidth, vbHeight] = (clone.getAttribute('viewBox') ?? '0 0 1000 1000')
    .split(/[\s,]+/)
    .map(Number)

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', vbWidth)
  clone.setAttribute('height', vbHeight)

  const markup = new XMLSerializer().serializeToString(clone)
  return {
    markup: `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`,
    width: vbWidth,
    height: vbHeight,
  }
}

/**
 * Rasterise the scene at `scale`x its authored size.
 *
 * The SVG is self-contained — no external images or fonts — so drawing it to
 * a canvas doesn't taint it and toBlob works.
 */
export async function renderToPngBlob(svgEl, scale) {
  const { markup, width, height } = serializeScene(svgEl)

  const edge = Math.max(width, height) * scale
  const safeScale = edge > MAX_RASTER_EDGE ? MAX_RASTER_EDGE / Math.max(width, height) : scale

  const svgBlob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  try {
    const image = new Image()
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = () => reject(new Error('The browser could not rasterise the scene.'))
      image.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * safeScale)
    canvas.height = Math.round(height * safeScale)

    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding the PNG failed.'))), 'image/png')
    })

    return { blob, width: canvas.width, height: canvas.height, clamped: safeScale !== scale }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** `gen-art-truchet-still-hokusai-12.svg` — the piece is identifiable from the filename alone. */
export function buildFilename(generatorId, seed, extension) {
  const safe = (s) => String(s).replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
  return `gen-art-${safe(generatorId)}-${safe(seed)}.${extension}`
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
