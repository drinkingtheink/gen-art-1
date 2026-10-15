/**
 * A room plate as a file: the photograph, with the piece hung in it.
 *
 * The plate on screen is not a picture — it is a stack of CSS. A photograph,
 * the framed work over it, and six layers of light on top of that: a shadow on
 * the plaster, the mat's recess, a sheen off the glass, the room coming back
 * out of the glazing, the wall's colour washed over the work, and the lit edge
 * of the moulding. Two of them blend with `multiply` and `soft-light`, and all
 * of them are tuned in `cqw` against hand-measured numbers in `mounts.js`.
 *
 * So this does not re-draw any of it. Re-drawing it would mean a second
 * renderer for a look that took a lot of tuning to get right, and a second
 * renderer is a thing that drifts: every later adjustment to the lighting
 * would have to be made twice, correctly, or the download would quietly stop
 * being what the screen shows.
 *
 * Instead the browser's own renderer does the work. The live element is cloned
 * with its computed styles written inline — which also resolves every `cqw` to
 * pixels — its photographs are inlined as data URIs, and the result is drawn
 * into a `<foreignObject>` and rasterised. What comes out is what Blink
 * painted, including the blend modes.
 *
 * There is exactly one thing Blink will not do inside a `foreignObject`, and
 * it is the one thing two of these rooms need: a 3D transform. `matrix3d` is
 * flattened to its affine part, which drops the perspective and hangs the
 * piece square on a wall that is being seen at an angle. Those rooms are
 * composited in two passes instead — see `renderPlateBlob`.
 */

/** Where the piece lives inside a plate, and what carries the 3D transform. */
const HUNG = '.hung'

/**
 * Longest edge of the file, in pixels.
 *
 * The plate is around 430px across on screen and the photographs behind it are
 * 1600 and up, so rasterising at display size would throw away most of what is
 * in the file. The `foreignObject` is drawn into a scaled context rather than
 * re-laid-out, so the vector content and the full-resolution photograph are
 * both sampled at this size from one pass.
 */
const LONG_EDGE = 2000

async function toDataUri(url) {
  const blob = await fetch(url).then((r) => r.blob())
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('could not read the photograph'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Every computed property, written inline on the clone.
 *
 * Wholesale rather than a chosen list: the plate's look is spread across
 * blend modes, inset shadows, gradients and container units, and a list of
 * properties to copy is a list that goes stale the first time someone styles
 * something new. Copying the lot also resolves `cqw` — the clone has no
 * container to query, and the resolved pixels are what we want anyway.
 */
function inlineComputedStyles(source, clone) {
  const from = [source, ...source.querySelectorAll('*')]
  const to = [clone, ...clone.querySelectorAll('*')]

  from.forEach((node, i) => {
    const computed = getComputedStyle(node)
    let text = ''
    for (const property of computed) {
      text += `${property}:${computed.getPropertyValue(property)};`
    }
    to[i].setAttribute('style', text)
  })
}

async function inlinePhotographs(clone) {
  const images = [clone, ...clone.querySelectorAll('*')].filter((n) => n.tagName === 'IMG')
  await Promise.all(
    images.map(async (img) => {
      if (img.src.startsWith('data:')) return
      img.setAttribute('src', await toDataUri(img.src))
    }),
  )
}

/**
 * One live element, rasterised at `scale`, as an `<img>` ready to draw.
 *
 * `prepare` runs on the clone before it is serialised, which is how the second
 * pass drops the transform and hides the work — the live DOM is never touched,
 * so nothing flickers on screen while a file is being made.
 */
async function rasteriseElement(element, { width, height, prepare, offset }) {
  const clone = element.cloneNode(true)
  inlineComputedStyles(element, clone)
  await inlinePhotographs(clone)
  prepare?.(clone)

  clone.style.margin = '0'

  const markup = new XMLSerializer().serializeToString(clone)

  /**
   * The offset goes on a wrapper, not on the clone.
   *
   * Writing it onto the clone looks like it should work and does not: the
   * computed styles were applied with one `setAttribute('style', …)`, so
   * `left` is already a declaration in that string, and assigning
   * `clone.style.left` afterwards rewrites that declaration *in place* rather
   * than appending a new one. It keeps its original position in the cascade,
   * where the element's own `left: 0` from the live layout had already been
   * written — and the piece rasterises in the corner, which on an angled wall
   * then gets faithfully warped to the wrong part of the room.
   *
   * A fresh element has no declarations to lose an argument with.
   */
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" ` +
    `style="position:relative;width:${width}px;height:${height}px">` +
    `<div style="position:absolute;left:${-(offset?.x ?? 0)}px;top:${-(offset?.y ?? 0)}px">` +
    `${markup}</div></div>` +
    `</foreignObject></svg>`

  const image = new Image()
  const ready = new Promise((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('the plate could not be rasterised'))
  })
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await ready
  return image
}

/**
 * A CSS transform as a 4x4, column-major, the way `matrix3d` writes it.
 *
 * `none` and the 2D `matrix()` form both come back as a full 4x4 so the caller
 * has one kind of thing to work with.
 */
function readTransform(value) {
  if (!value || value === 'none') return null

  const numbers = value
    .slice(value.indexOf('(') + 1, value.lastIndexOf(')'))
    .split(',')
    .map(Number)

  if (value.startsWith('matrix3d') && numbers.length === 16) return numbers
  if (numbers.length === 6) {
    const [a, b, c, d, e, f] = numbers
    return [a, b, 0, 0, c, d, 0, 0, 0, 0, 1, 0, e, f, 0, 1]
  }
  return null
}

/** Whether a transform actually projects, as opposed to merely moving things. */
function projects(m) {
  return !!m && (Math.abs(m[3]) > 1e-9 || Math.abs(m[7]) > 1e-9)
}

/** A point through the matrix, with the perspective divide. */
function project(m, x, y) {
  const w = m[3] * x + m[7] * y + m[15]
  const d = Math.abs(w) < 1e-9 ? 1e-9 : w
  return [(m[0] * x + m[4] * y + m[12]) / d, (m[1] * x + m[5] * y + m[13]) / d]
}

/**
 * One triangle of a bitmap, mapped onto one triangle of the canvas.
 *
 * Canvas 2D has no projective transform — `setTransform` is affine, which
 * cannot foreshorten. The standard way round it is to cut the source into
 * small triangles and give each one its own affine map: a projective map is
 * locally affine, so with enough of them the error falls below a pixel.
 *
 * The clip is grown a hair about the triangle's centroid because adjacent
 * clips that share an edge exactly leave a seam of background between them
 * once antialiasing has had its say.
 */
function drawTriangle(ctx, image, source, destination) {
  const [[sx0, sy0], [sx1, sy1], [sx2, sy2]] = source
  const [[dx0, dy0], [dx1, dy1], [dx2, dy2]] = destination

  const cx = (dx0 + dx1 + dx2) / 3
  const cy = (dy0 + dy1 + dy2) / 3
  const grow = ([x, y]) => {
    const len = Math.hypot(x - cx, y - cy) || 1
    return [x + ((x - cx) / len) * 0.6, y + ((y - cy) / len) * 0.6]
  }
  const [gx0, gy0] = grow([dx0, dy0])
  const [gx1, gy1] = grow([dx1, dy1])
  const [gx2, gy2] = grow([dx2, dy2])

  const den = sx0 * (sy2 - sy1) - sx1 * sy2 + sx2 * sy1 + (sx1 - sx2) * sy0
  if (!den) return

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(gx0, gy0)
  ctx.lineTo(gx1, gy1)
  ctx.lineTo(gx2, gy2)
  ctx.closePath()
  ctx.clip()

  ctx.transform(
    -(sy0 * (dx2 - dx1) - sy1 * dx2 + sy2 * dx1 + (sy1 - sy2) * dx0) / den,
    (sy1 * dy2 + sy0 * (dy1 - dy2) - sy2 * dy1 + (sy2 - sy1) * dy0) / den,
    (sx0 * (dx2 - dx1) - sx1 * dx2 + sx2 * dx1 + (sx1 - sx2) * dx0) / den,
    -(sx1 * dy2 + sx0 * (dy1 - dy2) - sx2 * dy1 + (sx2 - sx1) * dy0) / den,
    (sx0 * (sy2 * dx1 - sy1 * dx2) + sy0 * (sx1 * dx2 - sx2 * dx1) + (sx2 * sy1 - sx1 * sy2) * dx0) /
      den,
    (sx0 * (sy2 * dy1 - sy1 * dy2) + sy0 * (sx1 * dy2 - sx2 * dy1) + (sx2 * sy1 - sx1 * sy2) * dy0) /
      den,
  )
  ctx.drawImage(image, 0, 0)
  ctx.restore()
}

/**
 * A bitmap laid onto the wall's plane.
 *
 * `steps` is the grid the source is cut into. Sixteen is well past the point
 * where the seams stop being measurable on walls this shallow, and the whole
 * warp is a few hundred `drawImage` calls against a bitmap already in memory.
 */
function warp(ctx, image, { matrix, origin, box, scale, steps = 16 }) {
  const { x: ox, y: oy } = origin
  const at = (u, v) => {
    const [px, py] = project(matrix, box.left + u * box.width, box.top + v * box.height)
    return [(ox + px) * scale, (oy + py) * scale]
  }

  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const u0 = i / steps
      const u1 = (i + 1) / steps
      const v0 = j / steps
      const v1 = (j + 1) / steps

      const s = [
        [u0 * image.width, v0 * image.height],
        [u1 * image.width, v0 * image.height],
        [u1 * image.width, v1 * image.height],
        [u0 * image.width, v1 * image.height],
      ]
      const d = [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]

      drawTriangle(ctx, image, [s[0], s[1], s[2]], [d[0], d[1], d[2]])
      drawTriangle(ctx, image, [s[0], s[2], s[3]], [d[0], d[2], d[3]])
    }
  }
}

/**
 * How far the work's own shadow reaches past its box.
 *
 * Read off the computed shadow rather than guessed, because it is `cqw`-sized
 * against a 1300px box on the angled walls and a 198px one elsewhere — a fixed
 * number would either clip the shadow or waste most of the bitmap on nothing.
 */
function shadowReach(element) {
  const shadow = getComputedStyle(element).boxShadow
  if (!shadow || shadow === 'none') return 0

  let reach = 0
  for (const match of shadow.matchAll(/(-?[\d.]+)px/g)) {
    reach = Math.max(reach, Math.abs(Number(match[1])))
  }
  // Offset and blur are separate numbers in the string and both push outward,
  // so the largest alone is not the envelope. Doubling clears it with room.
  return Math.ceil(reach * 2) + 8
}

/**
 * The plate as a PNG blob.
 *
 * Flat rooms are one pass: the whole element, straight through the browser's
 * renderer, which is exact.
 *
 * Angled rooms are two, because `foreignObject` drops the perspective. The
 * room is rasterised with the work hidden, the work is rasterised on its own
 * with the transform taken off — and every one of its lighting layers comes
 * with it, because they are drawn in the work's flat local space and were only
 * ever being carried onto the wall by that same transform. Then the second
 * bitmap is warped onto the first through the matrix the browser computed.
 * Nothing about the look is re-derived; the only thing done by hand is the
 * projection Blink refused.
 */
export async function renderPlateBlob(roomEl) {
  const rect = roomEl.getBoundingClientRect()
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)
  if (!width || !height) throw new Error('the plate has no size yet')

  const scale = LONG_EDGE / Math.max(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')

  const hung = roomEl.querySelector(HUNG)
  const matrix = hung ? readTransform(getComputedStyle(hung).transform) : null

  if (!projects(matrix)) {
    const whole = await rasteriseElement(roomEl, { width, height })
    ctx.scale(scale, scale)
    ctx.drawImage(whole, 0, 0, width, height)
  } else {
    const room = await rasteriseElement(roomEl, {
      width,
      height,
      prepare: (clone) => {
        const copy = clone.querySelector(HUNG)
        if (copy) copy.style.display = 'none'
      },
    })
    ctx.drawImage(room, 0, 0, canvas.width, canvas.height)

    // The work's own box, grown to hold the shadow it throws.
    const pad = shadowReach(hung)
    const box = {
      left: -pad,
      top: -pad,
      width: hung.offsetWidth + pad * 2,
      height: hung.offsetHeight + pad * 2,
    }

    const work = await rasteriseElement(hung, {
      width: box.width,
      height: box.height,
      offset: { x: box.left, y: box.top },
      // Only the transform comes off. Every lighting layer inside is drawn in
      // the work's own flat space and is carried onto the wall by the warp,
      // exactly as the transform was carrying it before.
      prepare: (clone) => {
        clone.style.transform = 'none'
      },
    })

    // `.hung` is placed against the photograph, which is inset in the plate.
    const photo = hung.offsetParent ?? roomEl
    const photoRect = photo.getBoundingClientRect()

    warp(ctx, work, {
      matrix,
      origin: { x: photoRect.left - rect.left, y: photoRect.top - rect.top },
      box,
      scale,
    })
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('the plate could not be encoded'))),
      'image/png',
    )
  })
}
