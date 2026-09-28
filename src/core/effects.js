/**
 * Post effects.
 *
 * Bloom and chromatic aberration filter the *artwork*; the vignette sits over
 * everything. All three are canvas state like the grain and the shape, so no
 * generator knows they exist.
 *
 * The filter is applied to the shapes only, never the background rect. That
 * matters for aberration: splitting a filled background into colour channels
 * and screen-blending it back would wreck the paper, whereas splitting shapes
 * over a transparent backdrop reconstructs them exactly except at the edges,
 * which is the fringe you're after.
 *
 * Like the grain, these are raster effects: they survive PNG export and a
 * renderer that understands filters, and a pen plotter ignores them entirely.
 */

export const EFFECT_DEFAULTS = {
  bloom: 0,
  bloomRadius: 8,
  bloomThreshold: 0.35,
  aberration: 0,
  aberrationAngle: 0,
  vignette: 0,
  vignetteSpread: 0.55,
}

const clamp = (n, lo, hi, fallback) => {
  const v = Number(n)
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback
}

const round = (n, dp = 2) => Number(n.toFixed(dp))

export function coerceEffects(raw = {}) {
  return {
    bloom: round(clamp(raw.bloom, 0, 1, EFFECT_DEFAULTS.bloom)),
    bloomRadius: round(clamp(raw.bloomRadius, 1, 40, EFFECT_DEFAULTS.bloomRadius), 1),
    bloomThreshold: round(clamp(raw.bloomThreshold, 0, 0.95, EFFECT_DEFAULTS.bloomThreshold)),
    aberration: round(clamp(raw.aberration, 0, 14, EFFECT_DEFAULTS.aberration), 1),
    aberrationAngle: round(clamp(raw.aberrationAngle, 0, 360, EFFECT_DEFAULTS.aberrationAngle), 0),
    vignette: round(clamp(raw.vignette, 0, 1, EFFECT_DEFAULTS.vignette)),
    vignetteSpread: round(clamp(raw.vignetteSpread, 0.1, 0.95, EFFECT_DEFAULTS.vignetteSpread)),
  }
}

export const hasArtworkFilter = (e) => e.bloom > 0 || e.aberration > 0

/** Isolate one channel, keeping alpha. */
const channel = (which) => {
  const rows = { r: '1 0 0 0 0', g: '0 1 0 0 0', b: '0 0 1 0 0' }
  const zero = '0 0 0 0 0'
  return [
    which === 'r' ? rows.r : zero,
    which === 'g' ? rows.g : zero,
    which === 'b' ? rows.b : zero,
    '0 0 0 1 0',
  ].join(' ')
}

/**
 * Filter definition for the artwork, or null when neither effect is on — so a
 * piece without them exports with no filter at all.
 */
function artworkFilter(e, id) {
  const stages = []
  let source = 'SourceGraphic'

  if (e.aberration > 0) {
    const rad = (e.aberrationAngle * Math.PI) / 180
    const dx = round(Math.cos(rad) * e.aberration, 2)
    const dy = round(Math.sin(rad) * e.aberration, 2)

    stages.push(
      { tag: 'feOffset', attrs: { in: source, dx: -dx, dy: -dy, result: 'aR' } },
      { tag: 'feColorMatrix', attrs: { in: 'aR', type: 'matrix', values: channel('r'), result: 'cR' } },
      { tag: 'feColorMatrix', attrs: { in: source, type: 'matrix', values: channel('g'), result: 'cG' } },
      { tag: 'feOffset', attrs: { in: source, dx, dy, result: 'aB' } },
      { tag: 'feColorMatrix', attrs: { in: 'aB', type: 'matrix', values: channel('b'), result: 'cB' } },
      // Screen recombines the channels exactly where they overlap, and leaves
      // the fringe where the offsets don't.
      { tag: 'feBlend', attrs: { in: 'cR', in2: 'cG', mode: 'screen', result: 'aRG' } },
      { tag: 'feBlend', attrs: { in: 'aRG', in2: 'cB', mode: 'screen', result: 'split' } },
    )
    source = 'split'
  }

  if (e.bloom > 0) {
    // Threshold first, or everything smudges instead of glowing: only what's
    // already bright should bleed.
    const slope = round(1 / Math.max(0.05, 1 - e.bloomThreshold), 3)
    const intercept = round(-e.bloomThreshold * slope, 3)
    const transfer = ['feFuncR', 'feFuncG', 'feFuncB'].map((tag) => ({
      tag,
      attrs: { type: 'linear', slope, intercept },
    }))

    stages.push(
      { tag: 'feComponentTransfer', attrs: { in: source, result: 'bright' }, children: transfer },
      { tag: 'feGaussianBlur', attrs: { in: 'bright', stdDeviation: e.bloomRadius, result: 'blurred' } },
      {
        tag: 'feComponentTransfer',
        attrs: { in: 'blurred', result: 'glow' },
        children: [{ tag: 'feFuncA', attrs: { type: 'linear', slope: round(e.bloom * 2.2, 3) } }],
      },
      {
        tag: 'feMerge',
        attrs: {},
        children: [
          { tag: 'feMergeNode', attrs: { in: 'glow' } },
          { tag: 'feMergeNode', attrs: { in: source } },
        ],
      },
    )
  }

  if (!stages.length) return null

  return {
    tag: 'filter',
    // Blur and offset reach outside the source bounds; without room they clip.
    attrs: { id, x: '-20%', y: '-20%', width: '140%', height: '140%', 'color-interpolation-filters': 'sRGB' },
    children: stages,
  }
}

/**
 * Scene nodes for the effects.
 *
 * `defs` and `filterId` apply to the artwork group; `overlay` is drawn above
 * everything, alongside the grain.
 */
export function buildEffects(effects, seed, width, height) {
  const id = `fx-${String(seed).replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'x'}`
  const filter = artworkFilter(effects, id)

  const defs = []
  const overlay = []

  if (filter) defs.push(filter)

  if (effects.vignette > 0) {
    const gradientId = `${id}-vig`
    defs.push({
      tag: 'radialGradient',
      attrs: { id: gradientId, cx: '50%', cy: '50%', r: '75%' },
      children: [
        { tag: 'stop', attrs: { offset: `${Math.round(effects.vignetteSpread * 100)}%`, 'stop-color': '#000', 'stop-opacity': 0 } },
        { tag: 'stop', attrs: { offset: '100%', 'stop-color': '#000', 'stop-opacity': effects.vignette } },
      ],
    })
    overlay.push({
      tag: 'rect',
      attrs: { x: 0, y: 0, width, height, fill: `url(#${gradientId})` },
    })
  }

  return {
    defs: defs.length ? [{ tag: 'defs', attrs: {}, children: defs }] : [],
    filterId: filter ? id : null,
    overlay,
  }
}
