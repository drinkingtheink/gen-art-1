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
  interference: 0,
  interferenceScale: 0.05,
  interferenceBlend: 'screen',
  interferenceBurst: 0.5,
  glitch: 0,
  glitchScale: 0.06,
  bloom: 0,
  bloomRadius: 8,
  bloomThreshold: 0.35,
  aberration: 0,
  aberrationAngle: 0,
  vignette: 0,
  vignetteSpread: 0.55,
}

/**
 * Screen adds light and suits a dark piece; multiply eats it and suits paper.
 * Overlay pushes both ends and reads hardest.
 */
export const INTERFERENCE_BLENDS = [
  { value: 'screen', label: 'Screen · snow' },
  { value: 'overlay', label: 'Overlay · harsh' },
  { value: 'multiply', label: 'Multiply · dropout' },
  { value: 'difference', label: 'Difference · invert' },
]

const clamp = (n, lo, hi, fallback) => {
  const v = Number(n)
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback
}

const round = (n, dp = 2) => Number(n.toFixed(dp))

export function coerceEffects(raw = {}) {
  return {
    interference: round(clamp(raw.interference, 0, 1, EFFECT_DEFAULTS.interference)),
    interferenceScale: round(clamp(raw.interferenceScale, 0.005, 0.6, EFFECT_DEFAULTS.interferenceScale), 3),
    interferenceBlend: INTERFERENCE_BLENDS.some((b) => b.value === raw.interferenceBlend)
      ? raw.interferenceBlend
      : EFFECT_DEFAULTS.interferenceBlend,
    interferenceBurst: round(clamp(raw.interferenceBurst, 0, 1, EFFECT_DEFAULTS.interferenceBurst)),
    glitch: round(clamp(raw.glitch, 0, 1, EFFECT_DEFAULTS.glitch)),
    glitchScale: round(clamp(raw.glitchScale, 0.01, 0.3, EFFECT_DEFAULTS.glitchScale), 3),
    bloom: round(clamp(raw.bloom, 0, 1, EFFECT_DEFAULTS.bloom)),
    bloomRadius: round(clamp(raw.bloomRadius, 1, 40, EFFECT_DEFAULTS.bloomRadius), 1),
    bloomThreshold: round(clamp(raw.bloomThreshold, 0, 0.95, EFFECT_DEFAULTS.bloomThreshold)),
    aberration: round(clamp(raw.aberration, 0, 14, EFFECT_DEFAULTS.aberration), 1),
    aberrationAngle: round(clamp(raw.aberrationAngle, 0, 360, EFFECT_DEFAULTS.aberrationAngle), 0),
    vignette: round(clamp(raw.vignette, 0, 1, EFFECT_DEFAULTS.vignette)),
    vignetteSpread: round(clamp(raw.vignetteSpread, 0.1, 0.95, EFFECT_DEFAULTS.vignetteSpread)),
  }
}

export const hasArtworkFilter = (e) => e.bloom > 0 || e.aberration > 0 || e.glitch > 0

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

  if (e.glitch > 0) {
    // Turbulence stretched flat — almost no variation across, plenty down —
    // so it varies only by row. Quantising it to a handful of discrete levels
    // turns a smooth gradient into hard bands, which is the difference
    // between a warp and a tear.
    //
    // A displacement channel is centred at 0.5, so holding green there keeps
    // the offset purely horizontal: slices slide sideways and never drift up
    // or down.
    stages.push(
      {
        tag: 'feTurbulence',
        attrs: {
          type: 'fractalNoise',
          baseFrequency: `0.0008 ${round(e.glitchScale, 4)}`,
          numOctaves: 1,
          seed: 7,
          result: 'gNoise',
        },
      },
      {
        tag: 'feComponentTransfer',
        attrs: { in: 'gNoise', result: 'gSteps' },
        children: [
          { tag: 'feFuncR', attrs: { type: 'discrete', tableValues: '0 0.28 0.42 0.5 0.58 0.72 1' } },
          { tag: 'feFuncG', attrs: { type: 'discrete', tableValues: '0.5' } },
        ],
      },
      {
        tag: 'feDisplacementMap',
        attrs: {
          in: source,
          in2: 'gSteps',
          scale: round(e.glitch * 140, 2),
          xChannelSelector: 'R',
          yChannelSelector: 'G',
          result: 'torn',
        },
      },
    )
    source = 'torn'
  }

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
/** Deterministic 0..1 from an integer, so a given burst always behaves the same. */
function slotHash(n) {
  const x = Math.sin(n * 12.9898 + 4.1) * 43758.5453
  return x - Math.floor(x)
}

/**
 * How much static is showing at this instant.
 *
 * Constant static is wallpaper — it stops reading as interference and starts
 * reading as texture. This chops time into slots, fires only some of them, and
 * cuts hard in and out within the ones that fire, so the effect interrupts
 * rather than sits there.
 *
 * `burst` at 0 leaves it on permanently. Higher makes the interruptions rarer
 * and shorter.
 *
 * Slot zero always fires, so a piece that has never been played still shows
 * what the slider is doing rather than appearing broken.
 */
export function burstEnvelope(time, burst) {
  if (burst <= 0) return 1

  // Faster burst means shorter slots as well as fewer firings.
  const rate = 0.7 + burst * 2.6
  const slot = Math.floor(time * rate)
  const within = time * rate - slot
  if (slot <= 0) return 1

  const duty = 1 - burst * 0.82
  const fires = slotHash(slot)
  if (fires > duty) return 0

  const length = 0.12 + slotHash(slot + 7919) * 0.4
  if (within > length) return 0

  // Vary the strength between firings so it doesn't pulse mechanically.
  return 0.55 + slotHash(slot + 104729) * 0.45
}

/** feTurbulence takes an integer seed, so the piece's seed string is hashed down. */
function seedToInt(seed) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % 10000
}

export function buildEffects(effects, seed, width, height, time = 0) {
  const id = `fx-${String(seed).replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'x'}`
  const filter = artworkFilter(effects, id)

  const defs = []
  const overlay = []

  if (filter) defs.push(filter)

  const staticNow = effects.interference * burstEnvelope(time, effects.interferenceBurst)

  if (staticNow > 0.001) {
    const staticId = `${id}-static`
    defs.push({
      tag: 'filter',
      attrs: { id: staticId, x: '0%', y: '0%', width: '100%', height: '100%' },
      children: [
        {
          // Low frequency across, high down: the value barely changes along a
          // row and changes fast between rows, which is what draws the noise
          // into horizontal streaks. The other way round — which is what this
          // had first — gives vertical striping, and equal frequencies give
          // even snow that just reads as film grain.
          tag: 'feTurbulence',
          attrs: {
            type: 'fractalNoise',
            baseFrequency: `${round(effects.interferenceScale, 4)} 0.9`,
            numOctaves: 2,
            seed: seedToInt(String(seed)) + 1,
            stitchTiles: 'stitch',
            result: 'snow',
          },
        },
        { tag: 'feColorMatrix', attrs: { type: 'saturate', values: '0', result: 'grey' } },
        {
          // Crushed to a few discrete levels. Smooth turbulence looks like
          // haze; hard steps look like interference.
          tag: 'feComponentTransfer',
          attrs: { in: 'grey' },
          children: [
            { tag: 'feFuncR', attrs: { type: 'discrete', tableValues: '0 0 0 0.45 0.8 1' } },
            { tag: 'feFuncG', attrs: { type: 'discrete', tableValues: '0 0 0 0.45 0.8 1' } },
            { tag: 'feFuncB', attrs: { type: 'discrete', tableValues: '0 0 0 0.45 0.8 1' } },
          ],
        },
      ],
    })
    overlay.push({
      tag: 'rect',
      attrs: {
        x: 0,
        y: 0,
        width,
        height,
        filter: `url(#${staticId})`,
        opacity: round(staticNow, 3),
        style: `mix-blend-mode:${effects.interferenceBlend}`,
      },
    })
  }

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
