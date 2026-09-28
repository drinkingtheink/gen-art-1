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

/**
 * The effects field, in order. New effects append here and nowhere else.
 *
 * Glitch was added to the *front* once, which meant a link written before it
 * had nine fields shifted by two and had to be special-cased. Every shape this
 * field has ever had is listed below instead, and a link is matched to its
 * own by length — which is why appending is the only safe way to grow it.
 */
export const EFFECT_FIELDS = [
  'glitch',
  'glitchScale',
  'bloom',
  'bloomRadius',
  'bloomThreshold',
  'aberration',
  'aberrationAngle',
  'vignette',
  'vignetteSpread',
  'interference',
  'interferenceScale',
  'interferenceBlend',
  'interferenceBurst',
]

/** Field order as it stood when links of each length were written. */
const EFFECT_HISTORY = {
  7: EFFECT_FIELDS.slice(2, 9), // before glitch
  9: EFFECT_FIELDS.slice(0, 9), // before static
  12: EFFECT_FIELDS.slice(0, 12), // before static bursts
  13: EFFECT_FIELDS,
}

function decodeEffects(raw) {
  if (raw === undefined) return undefined
  const parts = raw.split(':')
  const order = EFFECT_HISTORY[parts.length] ?? EFFECT_FIELDS
  const out = {}
  order.forEach((key, i) => {
    if (parts[i] !== undefined && parts[i] !== '') out[key] = parts[i]
  })
  return out
}

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

export function encodeState({ generatorId, ratioId, grain, effects, treatment, seed, params }) {
  const encoded = Object.entries(params)
    .map(([key, value]) => `${key}:${encodeURIComponent(value)}`)
    .join(',')
  return (
    `g=${encodeURIComponent(generatorId)}` +
    `&r=${encodeURIComponent(ratioId)}` +
    `&n=${grain.amount}:${grain.scale}:${encodeURIComponent(grain.blend)}` +
    `&t=${treatment.bg}:${treatment.rotate}:${treatment.invert ? 1 : 0}:${treatment.muted.join('.')}` +
    `&e=${EFFECT_FIELDS.map((key) => effects[key]).join(':')}` +
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
  const [bg, rotate, invert, muted] = (safe(query.t) ?? '').split(':')
  const effects = decodeEffects(safe(query.e))

  return {
    generatorId: safe(query.g),
    ratioId: safe(query.r),
    grain: query.n === undefined ? undefined : { amount, scale, blend },
    treatment: query.t === undefined ? undefined : { bg, rotate, invert, muted },
    effects:
      query.e === undefined
        ? undefined
        : effects,
    seed: safe(query.s),
    params,
  }
}

/** State from the address bar right now, or null if there's nothing there. */
export function readHash() {
  return typeof window === 'undefined' ? null : decodeState(window.location.hash)
}
