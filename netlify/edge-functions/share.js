/**
 * Per-link social previews.
 *
 * A crawler does not run JavaScript, so it sees whatever meta tags are in the
 * HTML as served. This rewrites the SHARE-META block on the way past, so a
 * link to a particular piece advertises that piece — its name, its seed, and
 * an og:image pointing at /og with the same query string.
 *
 * Only the tags change. The app itself is untouched and still reads its state
 * from the same URL on the client, which means this layer can fail without
 * taking the page down: on any error the original HTML passes through with
 * its generic fallback tags intact.
 */

import { previewMeta } from '../../src/core/preview.js'

const START = '<!-- SHARE-META:START -->'
const END = '<!-- SHARE-META:END -->'

const attr = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export default async function share(request, context) {
  const response = await context.next()

  // Only HTML gets rewritten; assets and the /og image itself pass straight on.
  if (!response.headers.get('content-type')?.includes('text/html')) return response

  const url = new URL(request.url)
  // A bare visit has nothing to describe, so it keeps the site-level tags.
  // Checked before the body is touched, so this path stays a pass-through.
  if (!url.searchParams.get('g')) return response

  // Past this point the body has been consumed and the original response can
  // no longer be returned — every exit has to rebuild one from `html`.
  const html = await response.text()
  const passThrough = () =>
    new Response(html, { status: response.status, headers: response.headers })

  try {
    if (!html.includes(START)) return passThrough()

    const { title, description } = previewMeta(url.search)
    const image = new URL(`/og${url.search}`, url.origin).href
    const canonical = url.href

    const tags = `${START}
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="gen·art" />
    <meta property="og:title" content="${attr(title)}" />
    <meta property="og:description" content="${attr(description)}" />
    <meta property="og:url" content="${attr(canonical)}" />
    <meta property="og:image" content="${attr(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${attr(title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${attr(title)}" />
    <meta name="twitter:description" content="${attr(description)}" />
    <meta name="twitter:image" content="${attr(image)}" />
    <link rel="canonical" href="${attr(canonical)}" />
    ${END}`

    const rewritten = html.slice(0, html.indexOf(START)) + tags + html.slice(html.indexOf(END) + END.length)

    const headers = new Headers(response.headers)
    // Every link is a different document now, so the shared HTML cache entry
    // would otherwise hand one piece's tags to another piece's link.
    headers.set('cache-control', 'public, max-age=0, must-revalidate')
    headers.delete('content-length')
    return new Response(rewritten, { status: response.status, headers })
  } catch {
    // The tags are a nicety; the app reads the same URL on the client either
    // way. A failure here serves the page with its fallback tags rather than
    // failing the request.
    return passThrough()
  }
}

export const config = { path: '/*', excludedPath: ['/og', '/assets/*'] }
