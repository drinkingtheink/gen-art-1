/**
 * Named palettes.
 *
 * Colours are ordered quiet -> loud. rng.weighted() favours the front of the
 * list, so the first entry reads as the dominant field and the last as a rare
 * accent; line-based generators reverse this, because a thin stroke in the
 * quietest colour disappears. `bg` is the paper the piece sits on.
 *
 * Every set is scored on luminance range x mean saturation. Sets below ~0.35
 * read as bland or midtone-heavy on screen — greys, and anything whose colours
 * all sit at the same value — and are not kept.
 */
const PALETTES = [
  {
    id: 'flame',
    name: 'Flame',
    bg: '#f4eed2',
    // https://coolors.co/app/003049-d62828-f77f00-fcbf49-eae2b7
    colors: ['#eae2b7', '#fcbf49', '#003049', '#f77f00', '#d62828'],
  },
  {
    id: 'reef',
    name: 'Reef',
    bg: '#f7fff7',
    // https://coolors.co/1a535c-4ecdc4-f7fff7-ff6b6b-ffe66d
    colors: ['#f7fff7', '#4ecdc4', '#1a535c', '#ffe66d', '#ff6b6b'],
  },
  {
    id: 'blush',
    name: 'Blush',
    bg: '#f5f4f2',
    // https://coolors.co/app/f5f4f2-feedf3-feb4c1-cd3c67-3f3f3f
    colors: ['#f5f4f2', '#feedf3', '#feb4c1', '#cd3c67', '#3f3f3f'],
  },
  {
    id: 'moss',
    name: 'Moss',
    bg: '#fcfffc',
    // https://coolors.co/app/040f0f-248232-2ba84a-2d3a3a-fcfffc
    colors: ['#fcfffc', '#2d3a3a', '#2ba84a', '#248232', '#040f0f'],
  },
  {
    id: 'harbor',
    name: 'Harbor',
    bg: '#ebf2fa',
    // https://coolors.co/05668d-427aa1-ebf2fa-679436-a5be00
    colors: ['#ebf2fa', '#427aa1', '#05668d', '#a5be00', '#679436'],
  },
  {
    id: 'citrus',
    name: 'Citrus',
    bg: '#d3fad6',
    // https://coolors.co/app/270722-e01a4f-f3b61f-f7d488-d3fad6
    colors: ['#d3fad6', '#f7d488', '#f3b61f', '#e01a4f', '#270722'],
  },
  {
    id: 'neon',
    name: 'Neon',
    bg: '#0d1b2a',
    // https://coolors.co/app/a8f9ff-ffffff-56cbf9-ffe74c-ff729f
    colors: ['#a8f9ff', '#56cbf9', '#ffffff', '#ffe74c', '#ff729f'],
  },
  {
    id: 'ember',
    name: 'Ember',
    bg: '#faf3df',
    // https://coolors.co/app/f2dd6e-f2a359-e5b25d-b87d4b-523a34
    colors: ['#f2dd6e', '#e5b25d', '#f2a359', '#b87d4b', '#523a34'],
  },

  // --- high-chroma sets ---
  {
    id: 'riso',
    name: 'Riso',
    bg: '#fdf8f0',
    // Risograph fluorescents: they overprint rather than blend.
    colors: ['#fdf8f0', '#ffe800', '#00a95c', '#0078bf', '#ff48b0'],
  },
  {
    id: 'acid',
    name: 'Acid',
    bg: '#0b0b10',
    colors: ['#2f2f4a', '#7b2ff7', '#00e5a0', '#f2ff49', '#ff2e93'],
  },
  {
    id: 'sodium',
    name: 'Sodium',
    bg: '#10101c',
    // Sodium-vapour street light against night.
    colors: ['#2a2440', '#f5e6c8', '#ffb000', '#ff6a00', '#ff2d55'],
  },
  {
    id: 'vapor',
    name: 'Vapor',
    bg: '#120024',
    colors: ['#3a1a5e', '#b967ff', '#01cdfe', '#05ffa1', '#ff71ce'],
  },
  {
    id: 'ultra',
    name: 'Ultra',
    bg: '#f8f9fa',
    // Bauhaus primaries — flat, loud, no blending.
    colors: ['#f8f9fa', '#ffd60a', '#0033cc', '#e63946', '#0b090a'],
  },
  {
    id: 'poppy',
    name: 'Poppy',
    bg: '#fff8e7',
    colors: ['#fff3b0', '#ffba08', '#ff7b00', '#d00000', '#370617'],
  },
  {
    id: 'jade',
    name: 'Jade',
    bg: '#f0fffc',
    colors: ['#b2f7ef', '#00a878', '#ffd23f', '#00332c', '#011c1a'],
  },
  {
    id: 'plasma',
    name: 'Plasma',
    bg: '#0d0221',
    // Thermal ramp: black through magenta to white-hot yellow.
    colors: ['#2d0b4e', '#7209b7', '#f72585', '#ff8500', '#ffe66d'],
  },
  {
    id: 'aurora',
    name: 'Aurora',
    bg: '#050d16',
    colors: ['#0f2338', '#3fa7ff', '#b14aff', '#00ffc8', '#eaffff'],
  },
  {
    id: 'tangerine',
    name: 'Tangerine',
    bg: '#fffaf0',
    colors: ['#ffffff', '#ffea00', '#ff9e00', '#ff5400', '#00171f'],
  },
  {
    id: 'oxblood',
    name: 'Oxblood',
    bg: '#fdf6ec',
    colors: ['#f4d58d', '#e35337', '#8c1c13', '#2b0307', '#ffffff'],
  },
  {
    id: 'electric',
    name: 'Electric',
    bg: '#10002b',
    colors: ['#3c096c', '#9b5de5', '#00bbf9', '#00f5d4', '#fee440'],
  },
// --- second set: chosen to even out the spread. The first twenty ran
  // 13 light backgrounds to 7 dark and leaned yellow/red/cyan/orange, so
  // these are 13 dark to 7 light and weighted toward green, blue, violet
  // and magenta.
  {
    id: 'forest',
    name: 'Forest',
    bg: '#04140c',
    colors: ['#123a22', '#2f7d4f', '#7fd694', '#d8f58a', '#fff6c2'],
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    bg: '#050d1f',
    colors: ['#14275c', '#2f5fd0', '#5e9cff', '#a9d4ff', '#ffe066'],
  },
  {
    id: 'orchid',
    name: 'Orchid',
    bg: '#17061f',
    colors: ['#3b1152', '#7b2ea8', '#c25ce0', '#ff8ad8', '#ffd6f2'],
  },
  {
    id: 'rust',
    name: 'Rust',
    bg: '#150a06',
    colors: ['#3a1a0e', '#8c3b17', '#d96a2b', '#f0a556', '#ffe2b0'],
  },
  {
    id: 'abyss',
    name: 'Abyss',
    bg: '#021012',
    colors: ['#0b3038', '#14697a', '#2fb5b5', '#7ff0dc', '#e6fffb'],
  },
  {
    id: 'fuchsia',
    name: 'Fuchsia',
    bg: '#0a0410',
    colors: ['#2e0a2c', '#8a1063', '#e0229c', '#ff6fc8', '#ffd1ec'],
  },
  {
    id: 'lime',
    name: 'Lime',
    bg: '#0b1004',
    colors: ['#1e3308', '#4c7a10', '#8fd11a', '#d4f53a', '#f4ffb0'],
  },
  {
    id: 'ultraviolet',
    name: 'Ultraviolet',
    bg: '#0b0417',
    colors: ['#26104a', '#5a1fb0', '#9b4dff', '#d9a0ff', '#5cffd0'],
  },
  {
    id: 'spectrum',
    name: 'Spectrum',
    bg: '#060608',
    colors: ['#2b2b6e', '#1fa9c9', '#3ecf6b', '#ffc93c', '#ff3d6e'],
  },
  {
    id: 'ice',
    name: 'Ice',
    bg: '#060f1c',
    colors: ['#123049', '#2f6f96', '#68b6d9', '#b8e6f5', '#7cffd4'],
  },
  {
    id: 'magma',
    name: 'Magma',
    bg: '#0c0304',
    colors: ['#3d0812', '#93132a', '#e03e1f', '#ff9020', '#ffe15c'],
  },
  {
    id: 'indigo',
    name: 'Indigo',
    bg: '#0a0a2e',
    colors: ['#1e1b5e', '#3f39a8', '#7a6ff0', '#b6a8ff', '#f0e6ff'],
  },
  {
    id: 'verdigris',
    name: 'Verdigris',
    bg: '#0b1512',
    colors: ['#17362e', '#2d7a63', '#5fbfa0', '#c2e8b0', '#e8a33d'],
  },
  {
    id: 'sage',
    name: 'Sage',
    bg: '#f2f5ec',
    colors: ['#dbe8c4', '#9ac46a', '#3f8f3a', '#14532d', '#e2451f'],
  },
  {
    id: 'cerulean',
    name: 'Cerulean',
    bg: '#f2f9ff',
    colors: ['#dbeeff', '#8fc7ef', '#2f8ccf', '#0b4f8a', '#ff7b3d'],
  },
  {
    id: 'peony',
    name: 'Peony',
    bg: '#fff5f7',
    colors: ['#ffd9e4', '#ff9ab8', '#e8477f', '#8c1742', '#2b1020'],
  },
  {
    id: 'marigold',
    name: 'Marigold',
    bg: '#fffaeb',
    colors: ['#ffeeb8', '#ffd23f', '#f2a007', '#c25e00', '#3d2308'],
  },
  {
    id: 'denim',
    name: 'Denim',
    bg: '#eef2f7',
    colors: ['#c3d7ee', '#6f9ed6', '#2563a8', '#0d2f5c', '#ffb020'],
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    bg: '#fbf3ea',
    colors: ['#f0d9c0', '#d99a6c', '#b05432', '#6e2a17', '#2f8a7a'],
  },
  {
    id: 'mint',
    name: 'Mint',
    bg: '#f0fffa',
    colors: ['#c8f5e4', '#6fd9b8', '#17a882', '#0a5c4a', '#ff5c7a'],
  },
]


export const palettes = PALETTES

export const paletteById = Object.fromEntries(PALETTES.map((p) => [p.id, p]))

/** Option list in the shape the `select` param control expects. */
export const paletteOptions = PALETTES.map((p) => ({ value: p.id, label: p.name }))

/** Look up a palette, falling back to the first rather than returning undefined. */
export function getPalette(id) {
  return paletteById[id] ?? PALETTES[0]
}

/** Perceived lightness of '#rgb' or '#rrggbb', 0-255. */
export function lightness(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * The inks in a palette that separate from its own paper.
 *
 * Every set carries a colour or two sitting close to its background, which is
 * fine in a field of thousands of marks and not fine in a piece built from a
 * handful of large areas: there, an invisible ink is not texture, it is a hole
 * in the picture. Falls back to the full set rather than returning something
 * unusable.
 */
export function legibleInks(palette, gap = 26) {
  const paper = lightness(palette.bg)
  const kept = palette.colors.filter((ink) => Math.abs(lightness(ink) - paper) > gap)
  return kept.length >= 2 ? kept : palette.colors
}

/**
 * A palette at random, never the one named by `not`.
 *
 * Deliberately outside the seeded rng. Which set a piece opens in is a choice
 * the interface makes on your behalf, not part of what a seed reproduces — and
 * every permalink writes the palette out explicitly, so a shared link still
 * pins the one it was saved with. Pass an rng where the choice does have to be
 * repeatable.
 *
 * Excluding the current palette matters when this is used to change pieces:
 * one time in forty the roll would land on what is already on screen and the
 * switch would look like it had not taken.
 */
export function randomPaletteId(not = null, rng = null) {
  const float = rng ? rng.float : Math.random
  const pool = not ? PALETTES.filter((palette) => palette.id !== not) : PALETTES
  const from = pool.length ? pool : PALETTES
  return from[Math.floor(float() * from.length)].id
}

/** '#rrggbb' or '#rgb' -> [r,g,b]. */
function toRgb(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/**
 * Blend two palettes colour by colour.
 *
 * Straight sRGB interpolation, which can pass through a slightly muddy midpoint
 * between complementary hues. Perceptual blending would avoid that, but these
 * palettes are close enough in lightness that it doesn't show, and this keeps
 * the hot path cheap — it runs every frame during playback.
 */
export function mixPalettes(a, b, t) {
  if (t <= 0) return a
  if (t >= 1) return b
  const lerp = (x, y) => x + (y - x) * t
  const mixHex = (h1, h2) => {
    const c1 = toRgb(h1)
    const c2 = toRgb(h2)
    return toHex([lerp(c1[0], c2[0]), lerp(c1[1], c2[1]), lerp(c1[2], c2[2])])
  }
  return {
    id: `${a.id}~${b.id}`,
    name: `${a.name} / ${b.name}`,
    bg: mixHex(a.bg, b.bg),
    colors: a.colors.map((c, i) => mixHex(c, b.colors[i] ?? c)),
  }
}

/**
 * Where a continuously advancing cycle sits: which two palettes, and how far
 * between them. `hold` is the fraction of each step spent settled on a single
 * palette rather than in transition.
 *
 * `startId` anchors the walk to a chosen palette rather than always beginning
 * at the first one. Without it a running cycle ignores the palette you picked,
 * because the sequence is decided entirely by elapsed time.
 */
export function paletteAtCycle(position, startId = null, hold = 0.55) {
  const n = PALETTES.length
  const anchor = Math.max(0, PALETTES.findIndex((p) => p.id === startId))
  const step = Math.floor(position)
  const from = PALETTES[(anchor + step) % n]
  const to = PALETTES[(anchor + step + 1) % n]
  const within = position - step
  const linear = within < hold ? 0 : (within - hold) / (1 - hold)
  // Smoothstep: a linear cross-fade reads as a wipe, easing reads as a dissolve.
  const t = linear * linear * (3 - 2 * linear)
  return mixPalettes(from, to, t)
}

/**
 * Palette treatment — how the chosen palette gets used.
 *
 * Separate from *which* palette, which stays a per-piece param because
 * different pieces genuinely suit different sets. Treatment is canvas state
 * like the shape or the grain: it says which colour is paper, which dominates,
 * and which are in play at all.
 *
 * Applied after showcase's palette blending, so cycling and treatment compose.
 */

/** bg values below zero are sources outside the palette's own colours. */
export const BG_PALETTE = -1
export const BG_PAPER = -2
export const BG_INK = -3

export const TREATMENT_DEFAULTS = { bg: BG_PALETTE, rotate: 0, invert: false, muted: [] }

export function coerceTreatment(raw = {}) {
  const bg = Number(raw.bg)
  const rotate = Number(raw.rotate)
  // filter(Boolean) before Number: ''.split('.') is [''], and Number('') is 0,
  // which would silently mute colour 0 whenever muted was simply absent.
  const muted = (Array.isArray(raw.muted) ? raw.muted : String(raw.muted ?? '').split('.'))
    .filter((v) => v !== '' && v !== null && v !== undefined)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 4)
  return {
    bg: Number.isInteger(bg) && bg >= BG_INK && bg <= 4 ? bg : TREATMENT_DEFAULTS.bg,
    rotate: Number.isInteger(rotate) && rotate >= 0 && rotate <= 4 ? rotate : 0,
    invert: raw.invert === true || raw.invert === 'true' || raw.invert === '1',
    muted: [...new Set(muted)].sort(),
  }
}

/**
 * Resolve a palette through a treatment.
 *
 * `bg` indexes the palette's *original* colours, so the swatch you click is the
 * colour you get, whatever muting and rotation are doing to the ink order.
 */
export function applyTreatment(palette, treatment) {
  const t = treatment ?? TREATMENT_DEFAULTS

  let colors = palette.colors.filter((_, i) => !t.muted.includes(i))
  // Muting everything would leave generators with nothing to draw with.
  if (!colors.length) colors = [...palette.colors]

  if (t.invert) colors = [...colors].reverse()

  if (t.rotate) {
    const r = t.rotate % colors.length
    colors = [...colors.slice(r), ...colors.slice(0, r)]
  }

  let bg = palette.bg
  if (t.bg === BG_PAPER) bg = '#f7f7f4'
  else if (t.bg === BG_INK) bg = '#12121a'
  else if (t.bg >= 0) bg = palette.colors[t.bg] ?? palette.bg

  return { ...palette, colors, bg }
}

/**
 * The nearest whole palette to where the cycle currently sits.
 *
 * A cycling piece is usually showing a blend of two sets, and a blend has no
 * id — it can't be stored in a param or a link. Pausing therefore snaps to
 * whichever of the two it's nearer, which shifts the colour slightly but makes
 * the state something that can actually be written down.
 */
export function paletteIdAtCycle(position, startId = null, hold = 0.55) {
  const n = PALETTES.length
  const anchor = Math.max(0, PALETTES.findIndex((p) => p.id === startId))
  const step = Math.floor(position)
  const within = position - step
  const linear = within < hold ? 0 : (within - hold) / (1 - hold)
  const t = linear * linear * (3 - 2 * linear)
  return PALETTES[(anchor + step + (t < 0.5 ? 0 : 1)) % n].id
}

/** Swatch sources for the background picker, in the order they're shown. */
export function backgroundChoices(palette) {
  return [
    { value: BG_PALETTE, color: palette.bg, label: 'Palette paper' },
    ...palette.colors.map((color, i) => ({ value: i, color, label: `Colour ${i + 1}` })),
    { value: BG_PAPER, color: '#f7f7f4', label: 'Paper' },
    { value: BG_INK, color: '#12121a', label: 'Ink' },
  ]
}
