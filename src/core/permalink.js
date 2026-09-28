/**
 * URL state, as `#g=subdivision&r=square&s=quiet-heron-41&p=maxDepth:6,gutter:5`.
 *
 * Deliberately readable and hand-editable rather than base64 — a seed you can
 * spot and retype in a URL is worth more here than a few saved characters.
 * Every param is written out, including ones still at their default, so a
 * shared link keeps rendering the same piece even if a default is retuned
 * later.
 *
 * Nothing here validates against a schema; coerceAll does that on the way in.
 */

function parseQuery(raw) {
  return Object.fromEntries(
    raw
      .split('&')
      .filter(Boolean)
      .map((pair) => {
        const at = pair.indexOf('=')
        return at === -1 ? [pair, ''] : [pair.slice(0, at), pair.slice(at + 1)]
      }),
  )
}

export function encodeState({ generatorId, ratioId, grain, seed, params }) {
  const encoded = Object.entries(params)
    .map(([key, value]) => `${key}:${encodeURIComponent(value)}`)
    .join(',')
  return (
    `g=${encodeURIComponent(generatorId)}` +
    `&r=${encodeURIComponent(ratioId)}` +
    `&n=${grain.amount}:${grain.scale}:${encodeURIComponent(grain.blend)}` +
    `&s=${encodeURIComponent(seed)}` +
    `&p=${encoded}`
  )
}

export function decodeState(hash) {
  const raw = String(hash).replace(/^#/, '')
  if (!raw) return null

  const query = parseQuery(raw)
  const params = {}

  for (const entry of (query.p ?? '').split(',')) {
    if (!entry) continue
    // Split on the first colon only, so a value may contain one.
    const at = entry.indexOf(':')
    if (at === -1) continue
    try {
      params[decodeURIComponent(entry.slice(0, at))] = decodeURIComponent(entry.slice(at + 1))
    } catch {
      // Malformed percent-encoding: skip this key and let its default stand.
    }
  }

  const safe = (value) => {
    try {
      return value === undefined ? undefined : decodeURIComponent(value)
    } catch {
      return undefined
    }
  }

  // A link saved before ratios or grain existed carries no `r` or `n`; both
  // default to what those pieces were authored with — a 1000x1000 square and
  // no grain — so old links still render as they did.
  const [amount, scale, blend] = (safe(query.n) ?? '').split(':')

  return {
    generatorId: safe(query.g),
    ratioId: safe(query.r),
    grain: query.n === undefined ? undefined : { amount, scale, blend },
    seed: safe(query.s),
    params,
  }
}

/** State from the address bar right now, or null if there's nothing there. */
export function readHash() {
  return typeof window === 'undefined' ? null : decodeState(window.location.hash)
}
