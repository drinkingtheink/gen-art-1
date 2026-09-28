/**
 * Paper grain.
 *
 * A turbulence layer over the finished piece — the tooth of the paper rather
 * than anything the generator drew. It's a canvas property like the aspect
 * ratio, so generators stay pure and know nothing about it.
 *
 * Caveat worth repeating wherever this is used: this is a *raster* effect. The
 * exported SVG carries the filter instruction, and a renderer that understands
 * filters (browser, Illustrator) will apply it. A pen plotter will not — it
 * will draw the clean geometry underneath and the grain simply won't exist.
 */

export const BLEND_MODES = [
  { value: 'multiply', label: 'Multiply · tooth' },
  { value: 'overlay', label: 'Overlay · contrast' },
  { value: 'soft-light', label: 'Soft light · bloom' },
  { value: 'darken', label: 'Darken · speckle' },
]

export const GRAIN_DEFAULTS = { amount: 0, scale: 0.8, blend: 'multiply' }

const clamp = (n, lo, hi, fallback) => {
  const v = Number(n)
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback
}

/** Every value is bounded, so a hand-edited URL can't produce an unrenderable filter. */
export function coerceGrain(raw = {}) {
  return {
    amount: Number(clamp(raw.amount, 0, 1, GRAIN_DEFAULTS.amount).toFixed(2)),
    scale: Number(clamp(raw.scale, 0.1, 4, GRAIN_DEFAULTS.scale).toFixed(2)),
    blend: BLEND_MODES.some((b) => b.value === raw.blend) ? raw.blend : GRAIN_DEFAULTS.blend,
  }
}

/** feTurbulence takes an integer seed, so the piece's seed string is hashed down to one. */
function seedToInt(seed) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % 10000
}

/**
 * Scene nodes for the grain layer, or an empty array when it's off — so the
 * exported file carries no filter at all unless the grain is actually wanted.
 */
export function buildGrain({ amount, scale, blend }, seed, width, height) {
  if (!amount) return []

  const id = `grain-${seedToInt(String(seed))}`

  return [
    {
      tag: 'defs',
      attrs: {},
      children: [
        {
          tag: 'filter',
          attrs: { id, x: '0%', y: '0%', width: '100%', height: '100%' },
          children: [
            {
              tag: 'feTurbulence',
              attrs: {
                type: 'fractalNoise',
                baseFrequency: scale,
                numOctaves: 3,
                seed: seedToInt(String(seed)),
                stitchTiles: 'stitch',
                result: 'noise',
              },
            },
            // Turbulence is coloured; drain it so the grain reads as tone
            // rather than tinting the palette.
            { tag: 'feColorMatrix', attrs: { type: 'saturate', values: '0' } },
          ],
        },
      ],
    },
    {
      tag: 'rect',
      attrs: {
        x: 0,
        y: 0,
        width,
        height,
        filter: `url(#${id})`,
        opacity: amount,
        // Presentation attribute won't do — mix-blend-mode is style-only.
        style: `mix-blend-mode:${blend}`,
      },
    },
  ]
}
