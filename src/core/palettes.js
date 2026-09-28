/**
 * Named palettes, mostly ported from the circle-generator project's coolors
 * collection.
 *
 * Colours are ordered quiet -> loud. rng.weighted() favours the front of the
 * list, so the first entry reads as the dominant field and the last as a rare
 * accent. `bg` is the paper the piece sits on.
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
    id: 'dusk',
    name: 'Dusk',
    bg: '#f4ecf3',
    // https://coolors.co/231942-5e548e-9f86c0-be95c4-e0b1cb
    colors: ['#e0b1cb', '#be95c4', '#9f86c0', '#5e548e', '#231942'],
  },
  {
    id: 'reef',
    name: 'Reef',
    bg: '#f7fff7',
    // https://coolors.co/1a535c-4ecdc4-f7fff7-ff6b6b-ffe66d
    colors: ['#f7fff7', '#4ecdc4', '#1a535c', '#ffe66d', '#ff6b6b'],
  },
  {
    id: 'slate',
    name: 'Slate',
    bg: '#f4f4f9',
    // https://coolors.co/app/000000-2f4550-586f7c-b8dbd9-f4f4f9
    colors: ['#f4f4f9', '#b8dbd9', '#586f7c', '#2f4550', '#000000'],
  },
  {
    id: 'blush',
    name: 'Blush',
    bg: '#f5f4f2',
    // https://coolors.co/app/f5f4f2-feedf3-feb4c1-cd3c67-3f3f3f
    colors: ['#f5f4f2', '#feedf3', '#feb4c1', '#cd3c67', '#3f3f3f'],
  },
  {
    id: 'clay',
    name: 'Clay',
    bg: '#f8f1e2',
    // https://coolors.co/f7bb93-dc846e-e9dbd4-ebc2b6-f8f1e2
    colors: ['#f8f1e2', '#e9dbd4', '#ebc2b6', '#f7bb93', '#dc846e'],
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
    id: 'ember',
    name: 'Ember',
    bg: '#faf3df',
    // https://coolors.co/app/f2dd6e-f2a359-e5b25d-b87d4b-523a34
    colors: ['#f2dd6e', '#e5b25d', '#f2a359', '#b87d4b', '#523a34'],
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
    id: 'mono',
    name: 'Mono',
    bg: '#f2f2f2',
    colors: ['#f2f2f2', '#c9c9c9', '#7a7a7a', '#3f3f3f', '#111111'],
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
 */
export function paletteAtCycle(position, hold = 0.55) {
  const n = PALETTES.length
  const index = Math.floor(position) % n
  const from = PALETTES[(index + n) % n]
  const to = PALETTES[(index + 1) % n]
  const within = position - Math.floor(position)
  const t = within < hold ? 0 : (within - hold) / (1 - hold)
  return mixPalettes(from, to, t)
}
