/**
 * Getting the work out.
 *
 * The stage is already real vector, so SVG export is mostly a matter of
 * removing the things the app added: Vue's scoped-style attributes and the
 * layout classes. What's left is a self-contained file that opens anywhere —
 * Illustrator, Inkscape, or a pen plotter, which reads SVG natively.
 */

/** Browsers vary, but canvases much past this get unreliable and memory-hungry. */
export const MAX_RASTER_EDGE = 8192

/**
 * The multipliers the PNG control offers.
 *
 * Here rather than in the control, because the about page works out what each
 * paper size needs and has to answer in multipliers you can actually pick: it
 * is no use being told a size wants 4.2x when the menu goes 1, 2, 4, 8.
 */
export const PNG_SCALES = [1, 2, 4, 8]

export const WALLPAPER_QUALITY = 0.92

/**
 * How to encode a wallpaper, which is not one answer for every piece.
 *
 * Grain is turbulence, and noise is incompressible: the same screen-sized
 * truchet measures 8.70MB as a PNG with the grain up and 1.38MB as a JPEG at
 * q92. Without grain the two swap places — 0.39MB against 0.57MB — because
 * flat colour between hard edges is exactly what PNG is good at and exactly
 * what a DCT is bad at.
 *
 * So the grain picks the format rather than the destination picking it. Tested
 * on the markup rather than on the grain setting, because the question is
 * whether there is noise in the picture, and anything else that puts noise
 * there should get the same answer.
 *
 * The print exports stay PNG whatever happens: a file headed for paper is not
 * the place to spend quality on bytes.
 */
export function wallpaperEncoding(markup) {
  return /feTurbulence/.test(markup)
    ? { type: 'image/jpeg', extension: 'jpg', quality: WALLPAPER_QUALITY }
    : { type: 'image/png', extension: 'png' }
}

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
 * Draw the scene into a canvas of a given pixel size and encode it.
 *
 * Both raster exports come through here. They differ in two things only:
 * where the picture lands inside the canvas — a PNG fills it exactly, a
 * wallpaper is scaled up and cropped — and how the pixels are encoded. Those
 * are `place` and `encode`; everything else is shared.
 *
 * The SVG is self-contained — no external images or fonts — so drawing it to
 * a canvas doesn't taint it and toBlob works.
 */
async function rasterise(markup, canvasWidth, canvasHeight, place, encode = {}) {
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
    canvas.width = Math.round(canvasWidth)
    canvas.height = Math.round(canvasHeight)

    const ctx = canvas.getContext('2d')

    // JPEG has no alpha, so any pixel the picture doesn't reach encodes as
    // black rather than as nothing. Laying the paper down first means a format
    // without transparency still agrees with the piece everywhere.
    if (encode.background) {
      ctx.fillStyle = encode.background
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    const { x, y, width, height } = place(canvas.width, canvas.height)
    ctx.drawImage(image, x, y, width, height)

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Encoding the image failed.'))),
        encode.type ?? 'image/png',
        encode.quality,
      )
    })

    return { blob, width: canvas.width, height: canvas.height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Rasterise the scene at `scale`x its authored size. */
export async function renderToPngBlob(svgEl, scale) {
  const { markup, width, height } = serializeScene(svgEl)

  const edge = Math.max(width, height) * scale
  const safeScale = edge > MAX_RASTER_EDGE ? MAX_RASTER_EDGE / Math.max(width, height) : scale

  const out = await rasterise(markup, width * safeScale, height * safeScale, (w, h) => ({
    x: 0,
    y: 0,
    width: w,
    height: h,
  }))

  return { ...out, clamped: safeScale !== scale }
}

/**
 * The pixel size of the screen this is running on, upright.
 *
 * `screen` rather than the viewport, because a wallpaper covers the whole
 * display and the viewport is the display minus the browser's own furniture —
 * measure that and the picture comes out short by a toolbar. Multiplied by the
 * device pixel ratio, since `screen` is in CSS pixels and a phone's panel has
 * two or three real ones for each of them: a 402x874 reading is a 1206x2622
 * screen.
 *
 * The ratio is capped at 3. Past that the gain is invisible on a phone and the
 * cost is not — a 4x panel would ask for a 40-megapixel canvas.
 *
 * The short edge is always the width, whichever way the phone is being held.
 * A lock screen is portrait even when you turned sideways to look at the
 * piece, so a landscape reading is the orientation of the moment rather than
 * the shape of the file being asked for.
 */
export function phoneCanvas(win = globalThis) {
  const dpr = Math.min(win.devicePixelRatio || 1, 3)
  const cssW = win.screen?.width || win.innerWidth || 1080
  const cssH = win.screen?.height || win.innerHeight || 1920

  let width = Math.round(Math.min(cssW, cssH) * dpr)
  let height = Math.round(Math.max(cssW, cssH) * dpr)

  // No phone comes close to this, but a desktop asking for its own screen can:
  // the clamp keeps the shape and gives up the pixels.
  const longest = Math.max(width, height)
  if (longest > MAX_RASTER_EDGE) {
    const fit = MAX_RASTER_EDGE / longest
    width = Math.round(width * fit)
    height = Math.round(height * fit)
  }

  return { width, height }
}

/**
 * The piece as a phone background: the screen's exact pixels, filled.
 *
 * A phone screen is around 1:2 and no canvas shape here is — the tallest is
 * 1:√2 — so something has to give at the edges. It scales to cover and
 * crops what overflows, centred, rather than fitting the piece inside the
 * frame: a background with bars down two sides is not a background, and these
 * are fields of pattern rather than compositions with a subject, so losing a
 * margin costs nothing that a letterbox wouldn't cost more of.
 */
export async function renderToWallpaperBlob(svgEl, target = phoneCanvas()) {
  const { markup, width, height } = serializeScene(svgEl)
  const { extension, ...encode } = wallpaperEncoding(markup)

  const place = (w, h) => {
    const cover = Math.max(w / width, h / height)
    const drawn = { width: width * cover, height: height * cover }
    return {
      x: (w - drawn.width) / 2,
      y: (h - drawn.height) / 2,
      ...drawn,
    }
  }

  const out = await rasterise(markup, target.width, target.height, place, {
    ...encode,
    background: sceneBackground(svgEl),
  })

  return { ...out, extension }
}

/**
 * The paper the piece is drawn on, read off the live stage.
 *
 * `SvgStage` paints the background as the first rect in the document rather
 * than as a style on the SVG element, so that rect is where the colour is.
 * Cover leaves nothing uncovered anyway; this is what makes that a fact about
 * the crop rather than something the encoder has to be right about.
 */
function sceneBackground(svgEl) {
  return svgEl.querySelector('rect')?.getAttribute('fill') ?? ''
}

/**
 * `gen-art-truchet-still-hokusai-12.svg` — the piece is identifiable from the
 * filename alone.
 *
 * `suffix` names a file that is the same piece cut another way, so a phone
 * background lands in the camera roll as `-phone` beside the plain export
 * rather than overwriting it.
 */
export function buildFilename(generatorId, seed, extension, suffix = '') {
  const safe = (s) => String(s).replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
  const tail = suffix ? `-${safe(suffix)}` : ''
  return `gen-art-${safe(generatorId)}-${safe(seed)}${tail}.${extension}`
}

/**
 * Whether this browser can hand a file to the system share sheet.
 *
 * This is the whole reason the wallpaper has a second path. On iOS an
 * `<a download>` saves into Files, and the wallpaper picker in Settings reads
 * only Photos — so the download that looks like it worked leaves the file
 * somewhere it cannot be used from. The share sheet offers Save Image, and
 * Save Image means Photos.
 *
 * The probe is a real, empty File of the type that would actually be sent:
 * `canShare` answers per type, and `navigator.share` existing says nothing
 * about whether files are allowed through it.
 */
export function canShareImageFile() {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false

  try {
    const probe = new File([], 'probe.jpg', { type: 'image/jpeg' })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

/**
 * Hand a rendered blob to the share sheet.
 *
 * Must be called from inside the press that asked for it, and calls `share`
 * before it awaits anything. Safari requires transient user activation here,
 * and a screen-sized raster is an await long enough to spend it — which comes
 * back as `NotAllowedError` rather than as a sheet. So the render happens on
 * one press and this happens on the next.
 */
export function shareImageBlob(blob, filename) {
  const file = new File([blob], filename, { type: blob.type })
  if (!navigator.canShare?.({ files: [file] })) {
    throw new Error('this browser will not share a file')
  }

  return navigator.share({ files: [file] })
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
