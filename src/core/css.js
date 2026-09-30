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
 * Measured across all twenty pieces at their authored size: nine come in under
 * 60KB, the median is 73KB, and four — inversion, moire, dendrite, attractor —
 * run past 200KB, attractor worst at 344KB. Those are the ones that want their
 * own file instead of being pasted into a stylesheet.
 */
export const LARGE_BYTES = 60 * 1024
export const TOO_BIG_BYTES = 200 * 1024

/**
 * There is no raster mode, and that was a surprise.
 *
 * The plan was to offer an inline PNG for the heavy pieces, on the assumption
 * that a raster would be smaller than a few hundred kilobytes of path data.
 * Measured at their authored size, it never is — base64 adds a third, and this
 * is high-entropy line art, which is the worst case for PNG:
 *
 *   piece        inline SVG   PNG @1x
 *   subdivision         7KB      49KB
 *   truchet            30KB     316KB
 *   attractor         344KB     413KB   <- the closest it gets
 *   moire             278KB     2.1MB
 *
 * Grain makes it worse still rather than better, noise being incompressible.
 * So the escape from a large piece is a separate file, not a raster.
 */
export const CSS_MODES = [
  { value: 'svg', label: 'Inline · self-contained' },
  { value: 'file', label: 'Separate file · small CSS' },
]

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
    return `${formatBytes(bytes)} is a lot to paste into a stylesheet — the separate-file mode keeps it to two lines.`
  }
  if (bytes > LARGE_BYTES) {
    return `${formatBytes(bytes)} inline. It works, but it will dominate the file it lands in.`
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
