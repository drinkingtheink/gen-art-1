/**
 * URL state, as `?g=subdivision&r=square&s=quiet-rothko-41&p=maxDepth:6,gutter:5`.
 *
 * Deliberately readable and hand-editable rather than base64 — a seed you can
 * spot and retype in a URL is worth more here than a few saved characters.
 * Every param is written out, including ones still at their default, so a
 * shared link keeps rendering the same piece even if a default is retuned
 * later.
 *
 * This lives in the query string rather than the fragment because a fragment
 * never leaves the browser. Putting it after `?` means the server sees which
 * piece a link points at, which is what lets a shared link carry a preview
 * image of the actual artwork. Links written before this — where the same
 * fields sat after `#` — are still read, and get rewritten on load.
 *
 * One field is not part of the piece: `w` names the frame the work is hung in
 * and, by being present, says to open On the wall instead of the studio. It is
 * the one optional field, because a link to a piece and a link to that piece
 * on a wall should not be the same address.
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
/** The nine that have never moved, whatever has come and gone around them. */
const SETTLED_FIELDS = [
  'glitch',
  'glitchScale',
  'bloom',
  'bloomRadius',
  'bloomThreshold',
  'aberration',
  'aberrationAngle',
  'vignette',
  'vignetteSpread',
]

export const EFFECT_FIELDS = [...SETTLED_FIELDS, 'scanlines', 'scanlineGap', 'scanlineBlend']

/**
 * Field order as it stood when links of each length were written.
 *
 * The thirteen-field generation is kept by name rather than deleted with the
 * effect it belonged to. A link written then still carries four static values,
 * and reading them under their own names lets `coerceEffects` drop them on the
 * floor — where reading them positionally under the new names would pour them
 * into the scanline controls. Everything a reader of an old link should still
 * get, the nine settled fields, is at the same index in every generation.
 *
 * Twelve is the one length that means two things: scanlines now, and static
 * before bursts were added to it. Links from that window turn their static
 * into scanlines of the same strength, which is a fair reading of what they
 * were asking for, at the tightest line gap.
 */
const EFFECT_HISTORY = {
  7: SETTLED_FIELDS.slice(2), // before glitch
  9: SETTLED_FIELDS, // before static
  13: [
    ...SETTLED_FIELDS,
    'interference',
    'interferenceScale',
    'interferenceBlend',
    'interferenceBurst',
  ],
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

export function encodeState({ generatorId, ratioId, grain, effects, treatment, seed, params, wall }) {
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
    `&p=${encoded}` +
    // The only optional field, and the only one that is a *view* rather than
    // part of the piece. Written last so it reads as an instruction appended
    // to a piece's address, and omitted entirely when the wall is closed —
    // which keeps an ordinary piece link byte-identical to the ones already
    // out there, and means the field says something by existing at all.
    (wall ? `&w=${encodeURIComponent(wall)}` : '')
  )
}

export function decodeState(search) {
  const raw = String(search).replace(/^[?#]/, '')
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
    /**
     * Which frame to hang the piece in, and by being present at all, that it
     * should be hung — the gallery opens on arrival rather than the studio.
     *
     * `undefined` and `''` are distinct here. A link with no `w` is a studio
     * link; `w=` with nothing after it is still an instruction to hang, and
     * coerceFrame turns the empty value into the default frame. Anything else
     * would make a hand-trimmed URL silently drop the thing it was shared for.
     */
    wall: query.w === undefined ? undefined : (safe(query.w) ?? ''),
  }
}

/**
 * State from the address bar right now, or null if there's nothing there.
 *
 * The query string wins; the fragment is the fallback for links shared before
 * the move, and for the only case where both are present — an old link that
 * has just been opened on a path that already carried a query.
 */
export function readUrl() {
  if (typeof window === 'undefined') return null
  return decodeState(window.location.search) ?? decodeState(window.location.hash)
}
