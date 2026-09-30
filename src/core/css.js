/**
 * A piece as a CSS background.
 *
 * The stage is already a self-contained SVG document, so the only thing
 * standing between it and a stylesheet is an encoding — and the CSS `url()`
 * grammar is fussier than it looks. This is the one place that knows the rules.
 *
 * Deliberately pure and DOM-free: the encoding is the part that can be wrong in
 * ways you only notice as a silently blank background, so it needs to be
 * testable without a browser.
 */

/**
 * Where a data URI stops being a good idea.
 *
 * Measured across all twenty-one pieces at their authored size: nine come in under
 * 60KB, the median is 73KB, and four — inversion, moire, dendrite, attractor —
 * run past 200KB, attractor worst at 344KB. Those are the ones worth a warning
 * before they land in a stylesheet.
 */
export const LARGE_BYTES = 60 * 1024
export const TOO_BIG_BYTES = 200 * 1024

/**
 * There is no raster mode and no file mode, and the first was a surprise.
 *
 * The raster was planned — an inline PNG for the heavy pieces, on the
 * assumption a bitmap would beat a few hundred kilobytes of path data.
 * Measured at their authored size it never does; base64 adds a third, and this
 * is high-entropy line art, the worst case for PNG:
 *
 *   piece        inline SVG   PNG @1x
 *   subdivision         7KB      49KB
 *   truchet            30KB     316KB
 *   attractor         344KB     413KB   <- the closest it gets
 *   moire             278KB     2.1MB
 *
 * Grain makes it worse still rather than better, noise being incompressible.
 *
 * The file mode went for a plainer reason: a rule that points at a sibling SVG
 * means keeping two things together and putting one of them somewhere. The
 * whole appeal of a data URI is that there is nothing to host, so the rule is
 * shown in full and copied by hand.
 */

/** Bytes on the wire, not characters — the difference is every non-ASCII glyph. */
export function byteLength(text) {
  return new TextEncoder().encode(text).length
}

export function formatBytes(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.round(bytes / 1024)}KB`
}

/** What to say about a payload of this size, or null when there's nothing to say. */
export function adviceFor(bytes) {
  if (bytes > TOO_BIG_BYTES) {
    return 'Large enough that it wants a stylesheet of its own.'
  }
  if (bytes > LARGE_BYTES) {
    return 'It works, but it will dominate the file it lands in.'
  }
  return null
}

/**
 * An SVG document as a `data:` URI fit for `url("…")`.
 *
 * Percent-encoded rather than base64: base64 inflates by a third, while this
 * leaves the markup legible and compresses far better — attractor's 344KB goes
 * to 127KB gzipped, which is what actually crosses the wire.
 *
 * Only the characters that would break out of the URI or the CSS value are
 * escaped. `#` is the one that bites: left raw it starts a fragment and the
 * image silently truncates to nothing. `%` has to go first, or it would escape
 * the escapes.
 */
export function toDataUri(svg) {
  // The XML prolog is required of a standalone file and pointless here, where
  // the media type has already said what this is.
  const body = svg.replace(/^<\?xml[^>]*\?>\s*/, '')

  // `%` goes first and alone. Every escape below inserts one, so escaping them
  // afterwards would escape the escapes — `%22` became `%2522`, which decodes
  // to a literal `%22` and leaves the markup malformed.
  const escaped = body.replace(/%/g, '%25')

  // Swapping the attribute quotes to apostrophes lets the CSS keep its own
  // double quotes and costs one character per attribute instead of three. Only
  // safe if no value already contains an apostrophe, so that is checked rather
  // than assumed.
  const quoted = escaped.includes("'") ? escaped.replace(/"/g, '%22') : escaped.replace(/"/g, "'")

  const encoded = quoted
    .replace(/#/g, '%23')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/\?/g, '%3F')
    .replace(/\[/g, '%5B')
    .replace(/\]/g, '%5D')
    .replace(/\\/g, '%5C')
    .replace(/\^/g, '%5E')
    .replace(/`/g, '%60')
    .replace(/\{/g, '%7B')
    .replace(/\|/g, '%7C')
    .replace(/\}/g, '%7D')
    // Newlines and tabs are legal in a URI but not worth the bytes.
    .replace(/[\r\n\t]+/g, ' ')

  return `data:image/svg+xml,${encoded}`
}

/**
 * The rule itself.
 *
 * `background-color` is the piece's own background, so the block degrades to
 * the right colour while the image decodes, and stays right if it is blocked
 * entirely. `no-repeat`, because no piece here is drawn to tile — repeating one
 * shows its seams immediately.
 */
export function buildCssRule({ image, background, selector = '.gen-art', fit = 'cover' }) {
  return [
    `${selector} {`,
    `  background-color: ${background};`,
    `  background-image: url("${image}");`,
    `  background-size: ${fit};`,
    `  background-position: center;`,
    `  background-repeat: no-repeat;`,
    `}`,
  ].join('\n')
}
