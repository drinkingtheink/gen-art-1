/**
 * Named palettes.
 *
 * Colours are ordered quiet -> loud. rng.weighted() favours the front of the
 * list, so the first entry reads as the dominant field and the last as a rare
 * accent; line-based generators reverse this, because a thin stroke in the
 * quietest colour disappears. `bg` is the paper the piece sits on.
 *
 * Every set is scored on luminance range x mean saturation, and the number is
 * in the comment above its colours. The bar is 0.42: below that a set reads as
 * bland or midtone-heavy on screen — greys, and anything whose colours all sit
 * at the same value.
 *
 * Sets are also kept apart from one another, not just from mud. No two are
 * closer than 22 units of CIE Lab distance, measured as the mean nearest-colour
 * distance between their two colour sets — the previous collection had pairs at
 * 16.8 that read as the same palette twice.
 */
const PALETTES = [
  {
    id: 'riso',
    name: 'Riso',
    bg: '#fdf8f0',
    // 0.44
    colors: ['#fdf8f0', '#ffe800', '#00a95c', '#0078bf', '#ff48b0'],
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    bg: '#050d1f',
    // 0.45
    colors: ['#14275c', '#2f5fd0', '#5e9cff', '#a9d4ff', '#ffe066'],
  },
  {
    id: 'moss',
    name: 'Moss',
    bg: '#fcfffc',
    // 0.46
    colors: ['#fcfffc', '#2d3a3a', '#2ba84a', '#248232', '#040f0f'],
  },
  {
    id: 'bindweed',
    name: 'Bindweed',
    bg: '#f7f2e6',
    // 0.48
    colors: ['#25113d', '#7b4ab8', '#b98ce8', '#f6e48a', '#c8ff2e'],
  },
  {
    id: 'ocotillo',
    name: 'Ocotillo',
    bg: '#f5ecd8',
    // 0.48
    colors: ['#241f0e', '#5c6b2f', '#f2dca0', '#f5a623', '#e0197f'],
  },
  {
    id: 'geyser',
    name: 'Geyser',
    bg: '#eef5f2',
    // 0.48
    colors: ['#073d4a', '#1f96a8', '#8fe0cf', '#f5e04a', '#e85a14'],
  },
  {
    id: 'ukiyo',
    name: 'Ukiyo',
    bg: '#f2ece0',
    // 0.49
    colors: ['#101c3d', '#3d7fa6', '#e8dca8', '#c25a2a', '#c8203c'],
  },
  {
    id: 'mesa',
    name: 'Mesa',
    bg: '#f2e6d2',
    // 0.49
    colors: ['#1f120e', '#2f6b5c', '#f2dca8', '#cf7a2a', '#e34a14'],
  },
  {
    id: 'fauve',
    name: 'Fauve',
    bg: '#f5efe2',
    // 0.50
    colors: ['#123f2e', '#1f6fa8', '#f2d94a', '#e8431f', '#ff1f8f'],
  },
  {
    id: 'tropic',
    name: 'Tropic',
    bg: '#041012',
    // 0.50
    colors: ['#0d3a37', '#16a08f', '#ffd12e', '#ff6b3d', '#ff2d8f'],
  },
  {
    id: 'thicket',
    name: 'Thicket',
    bg: '#f7f4ec',
    // 0.51
    colors: ['#8fd98a', '#1d6b45', '#2a1208', '#b5431c', '#f2b705'],
  },
  {
    id: 'cochineal',
    name: 'Cochineal',
    bg: '#fdf4f6',
    // 0.51
    colors: ['#f6a8bd', '#c2185b', '#3d0a2b', '#ff3d6e', '#ffcf3d'],
  },
  {
    id: 'fuchsia',
    name: 'Fuchsia',
    bg: '#0a0410',
    // 0.51
    colors: ['#2e0a2c', '#8a1063', '#e0229c', '#ff6fc8', '#ffd1ec'],
  },
  {
    id: 'sodium',
    name: 'Sodium',
    bg: '#10101c',
    // 0.52
    colors: ['#2a2440', '#f5e6c8', '#ffb000', '#ff6a00', '#ff2d55'],
  },
  {
    id: 'pennant',
    name: 'Pennant',
    bg: '#f7f4ef',
    // 0.54
    colors: ['#8fb8f5', '#0d1b2e', '#00843d', '#c8102e', '#ffc400'],
  },
  {
    id: 'jadeite',
    name: 'Jadeite',
    bg: '#04100d',
    // 0.54
    colors: ['#0c2f28', '#0f6b52', '#17c48e', '#5cffd0', '#ffd23d'],
  },
  {
    id: 'flame',
    name: 'Flame',
    bg: '#f4eed2',
    // 0.54
    colors: ['#eae2b7', '#fcbf49', '#003049', '#f77f00', '#d62828'],
  },
  {
    id: 'ozone',
    name: 'Ozone',
    bg: '#060d14',
    // 0.54
    colors: ['#0f2b40', '#1f7fc2', '#4fd6ff', '#c9fbff', '#a3ff12'],
  },
  {
    id: 'ultra',
    name: 'Ultra',
    bg: '#f8f9fa',
    // 0.54
    colors: ['#f8f9fa', '#ffd60a', '#0033cc', '#e63946', '#0b090a'],
  },
  {
    id: 'peacock',
    name: 'Peacock',
    bg: '#03080e',
    // 0.55
    colors: ['#092a45', '#0f6f8f', '#1bbfae', '#8f4dff', '#ffcf2e'],
  },
  {
    id: 'aster',
    name: 'Aster',
    bg: '#f5f6fb',
    // 0.55
    colors: ['#9fb0ef', '#2a2fc0', '#0d0f3d', '#ffd500', '#ff2e7a'],
  },
  {
    id: 'acid',
    name: 'Acid',
    bg: '#0b0b10',
    // 0.55
    colors: ['#2f2f4a', '#7b2ff7', '#00e5a0', '#f2ff49', '#ff2e93'],
  },
  {
    id: 'klaxon',
    name: 'Klaxon',
    bg: '#fbfbf9',
    // 0.55
    colors: ['#9fe8f2', '#00a3c4', '#1b1b3a', '#ffd400', '#ff1f8f'],
  },
  {
    id: 'citrus',
    name: 'Citrus',
    bg: '#d3fad6',
    // 0.56
    colors: ['#d3fad6', '#f7d488', '#f3b61f', '#e01a4f', '#270722'],
  },
  {
    id: 'ensign',
    name: 'Ensign',
    bg: '#f1f3f6',
    // 0.56
    colors: ['#b3d4ff', '#2a5db0', '#071634', '#ff8a00', '#e01b24'],
  },
  {
    id: 'helium',
    name: 'Helium',
    bg: '#0f0410',
    // 0.56
    colors: ['#35102e', '#a82a5e', '#ff5c7a', '#ffd84d', '#00e5ff'],
  },
  {
    id: 'hedgerow',
    name: 'Hedgerow',
    bg: '#f9f5f0',
    // 0.56
    colors: ['#c2d98f', '#2f7a12', '#2a0b26', '#a81070', '#ffc107'],
  },
  {
    id: 'aurora',
    name: 'Aurora',
    bg: '#050d16',
    // 0.56
    colors: ['#0f2338', '#3fa7ff', '#b14aff', '#00ffc8', '#eaffff'],
  },
  {
    id: 'lagoon',
    name: 'Lagoon',
    bg: '#01090f',
    // 0.56
    colors: ['#082a3d', '#0f6f99', '#17c8e0', '#6cf7ff', '#ff4d6d'],
  },
  {
    id: 'oxblood',
    name: 'Oxblood',
    bg: '#fdf6ec',
    // 0.57
    colors: ['#f4d58d', '#e35337', '#8c1c13', '#2b0307', '#ffffff'],
  },
  {
    id: 'cyanotype',
    name: 'Cyanotype',
    bg: '#f1f4f8',
    // 0.57
    colors: ['#04080f', '#10325e', '#4b86c9', '#cfe4f7', '#ffdd00'],
  },
  {
    id: 'cinnabar',
    name: 'Cinnabar',
    bg: '#0a0403',
    // 0.57
    colors: ['#4a0d06', '#a81f0c', '#f03a10', '#ff8a2b', '#00ecd1'],
  },
  {
    id: 'bitumen',
    name: 'Bitumen',
    bg: '#0c0806',
    // 0.59
    colors: ['#140a02', '#4a2a10', '#a16c38', '#f0dcb8', '#00e5ff'],
  },
  {
    id: 'venom',
    name: 'Venom',
    bg: '#030a06',
    // 0.59
    colors: ['#0a2e18', '#0f7a35', '#1fd65a', '#7dff3d', '#ff00a8'],
  },
  {
    id: 'jewel',
    name: 'Jewel',
    bg: '#06040a',
    // 0.60
    colors: ['#1a0f3d', '#153fa8', '#0f9e6b', '#c41e5c', '#ffc824'],
  },
  {
    id: 'cryolite',
    name: 'Cryolite',
    bg: '#eef4f8',
    // 0.60
    colors: ['#120c4d', '#1f3fc4', '#1f8fe0', '#3fdde0', '#a8f7ff'],
  },
  {
    id: 'marigold',
    name: 'Marigold',
    bg: '#fffaeb',
    // 0.60
    colors: ['#ffeeb8', '#ffd23f', '#f2a007', '#c25e00', '#3d2308'],
  },
  {
    id: 'bramble',
    name: 'Bramble',
    bg: '#f2f5ec',
    // 0.61
    colors: ['#03140a', '#10561f', '#2f8f4c', '#d8f0a8', '#ff007f'],
  },
  {
    id: 'voltage',
    name: 'Voltage',
    bg: '#01050f',
    // 0.63
    colors: ['#0b1240', '#2233ff', '#00b3ff', '#7de8ff', '#ff2e00'],
  },
  {
    id: 'chlorophyll',
    name: 'Chlorophyll',
    bg: '#08110a',
    // 0.63
    colors: ['#0a2e14', '#17662a', '#4fa314', '#a8d419', '#eaff4a'],
  },
  {
    id: 'citron',
    name: 'Citron',
    bg: '#0a0c02',
    // 0.64
    colors: ['#2b3206', '#7a8c0b', '#cfe015', '#fff23d', '#ff3b1f'],
  },
  {
    id: 'solar',
    name: 'Solar',
    bg: '#0e0900',
    // 0.65
    colors: ['#3a2600', '#a06a00', '#ffc400', '#ffef8a', '#7c3bff'],
  },
  {
    id: 'electric',
    name: 'Electric',
    bg: '#10002b',
    // 0.65
    colors: ['#3c096c', '#9b5de5', '#00bbf9', '#00f5d4', '#fee440'],
  },
  {
    id: 'jade',
    name: 'Jade',
    bg: '#f0fffc',
    // 0.66
    colors: ['#b2f7ef', '#00a878', '#ffd23f', '#00332c', '#011c1a'],
  },
  {
    id: 'iris',
    name: 'Iris',
    bg: '#0a0518',
    // 0.67
    colors: ['#1d0a4d', '#4f19c4', '#8b2bff', '#c86bff', '#f7ff4d'],
  },
  {
    id: 'plasma',
    name: 'Plasma',
    bg: '#0d0221',
    // 0.68
    colors: ['#2d0b4e', '#7209b7', '#f72585', '#ff8500', '#ffe66d'],
  },
  {
    id: 'flare',
    name: 'Flare',
    bg: '#0b0203',
    // 0.74
    colors: ['#3d0014', '#9b0b28', '#ee1133', '#ff6a1f', '#ffe94d'],
  },
  {
    id: 'tangerine',
    name: 'Tangerine',
    bg: '#fffaf0',
    // 0.74
    colors: ['#ffffff', '#ffea00', '#ff9e00', '#ff5400', '#00171f'],
  },
  {
    id: 'cerise',
    name: 'Cerise',
    bg: '#0d0210',
    // 0.77
    colors: ['#40002b', '#a3007a', '#ff1f8f', '#ffd400', '#aaff00'],
  },
  {
    id: 'laser',
    name: 'Laser',
    bg: '#000305',
    // 0.78
    colors: ['#08202b', '#00a2ff', '#ff0055', '#00ff8c', '#faff00'],
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
 * one time in fifty the roll would land on what is already on screen and the
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
