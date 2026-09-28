/**
 * /og — the artwork a shared link points at, as a PNG.
 *
 * There is no database here and nothing is ever stored. A permalink carries
 * every parameter of the piece, and the generators are pure functions of
 * (params, seeded rng), so the same URL that draws the piece in the browser
 * redraws it here byte for byte. The image is derived, not saved.
 *
 * Effects and grain are omitted: they are SVG filters, and resvg's filter
 * support is partial, so including them would produce a preview that quietly
 * disagrees with the page.
 */

import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import { CARD, renderPreview } from '../../src/core/preview.js'

const require = createRequire(import.meta.url)

/**
 * The wasm binary, loaded once per container.
 *
 * initWasm throws if called twice, and a warm container serves many requests,
 * so the promise itself is the cache — concurrent first requests all await
 * the same initialisation rather than racing into a second one.
 */
let ready = null
function initOnce() {
  ready ??= readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')).then(initWasm)
  return ready
}

export default async function handler(request) {
  const search = new URL(request.url).search

  try {
    await initOnce()
    const { svg, title } = renderPreview(search, { frame: CARD })
    const png = new Resvg(svg, {
      // Nothing emits <text>, so there is no reason to pay for font discovery.
      font: { loadSystemFonts: false },
      fitTo: { mode: 'width', value: CARD.width },
    })
      .render()
      .asPng()

    return new Response(png, {
      headers: {
        'content-type': 'image/png',
        // The image is a pure function of the query string, so it can be
        // cached hard and forever — a different piece is a different URL.
        'cache-control': 'public, max-age=31536000, immutable',
        'x-piece': title,
      },
    })
  } catch (error) {
    // A scraper that gets a 500 shows a broken card. Say what went wrong in a
    // header and let the caller fall back to no image at all.
    return new Response('', {
      status: 302,
      headers: { location: '/favicon.ico', 'x-og-error': String(error?.message ?? error).slice(0, 200) },
    })
  }
}

export const config = { path: '/og' }
