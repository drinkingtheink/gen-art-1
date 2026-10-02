/**
 * Seeded randomness.
 *
 * Generators are pure functions of (params, rng) — they must draw every random
 * value from the rng handed to them and never touch Math.random, or the same
 * seed will stop producing the same picture.
 */

/** Hash an arbitrary string into a well-mixed 32-bit integer. */
function xmur3(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

/** Small fast PRNG with a 2^32 period — plenty for one composition. */
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Build a deterministic random source from a seed string.
 * Same seed in, same sequence out, every time.
 */
export function createRng(seed) {
  const next = mulberry32(xmur3(String(seed))())
  let spare = null

  return {
    /** Float in [0, 1). */
    float: next,

    /** Float in [min, max). */
    range(min, max) {
      return min + next() * (max - min)
    },

    /** Integer in [min, max], inclusive at both ends. */
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1))
    },

    /** True with probability p. */
    bool(p = 0.5) {
      return next() < p
    },

    /** One item, uniformly. */
    pick(items) {
      return items[Math.floor(next() * items.length)]
    },

    /**
     * One item, favouring the front of the list. bias 0 is uniform; higher
     * values concentrate on early entries, which is how a palette gets a
     * dominant colour instead of an even scatter of all five.
     */
    weighted(items, bias = 1) {
      if (bias <= 0) return items[Math.floor(next() * items.length)]
      const t = next() ** (1 + bias)
      return items[Math.min(items.length - 1, Math.floor(t * items.length))]
    },

    /** Normally distributed value (Box-Muller, with the second value cached). */
    gauss(mean = 0, sd = 1) {
      if (spare !== null) {
        const value = spare
        spare = null
        return mean + sd * value
      }
      let u = 0
      let v = 0
      let s = 0
      do {
        u = next() * 2 - 1
        v = next() * 2 - 1
        s = u * u + v * v
      } while (s === 0 || s >= 1)
      const factor = Math.sqrt((-2 * Math.log(s)) / s)
      spare = v * factor
      return mean + sd * (u * factor)
    },
  }
}

const ADJECTIVES = [
  'quiet', 'amber', 'hollow', 'drifting', 'velvet', 'crooked', 'pale', 'salt',
  'copper', 'winter', 'glass', 'tidal', 'low', 'restless', 'iron', 'soft',
  'distant', 'humming', 'bramble', 'slow', 'ember', 'wayward', 'dusty', 'still',
]

/**
 * Painters, and the people who got here first.
 *
 * The last twelve are the lineage this project sits in — Albers and Riley
 * making rule-driven work by hand, then Molnar, Mohr, Nake and Noll doing it on
 * plotters in the sixties, and LeWitt writing wall drawings as instructions for
 * someone else to execute, which is what a generator is.
 *
 * ASCII and single-word on purpose: a seed has to survive being read down a
 * phone and retyped from a URL bar, so no diacritics (Molnár, Vasarely's
 * Hungarian) and nothing hyphenated. Kept clear of words that are also plain
 * English — Bacon, Close, Martin — which would read as descriptors, and of
 * Truchet and Chladni, who are already pieces.
 */
const ARTISTS = [
  'klee', 'kahlo', 'monet', 'rothko', 'turner', 'hokusai', 'mondrian', 'escher',
  'vermeer', 'matisse', 'picasso', 'kandinsky', 'klimt', 'goya', 'pollock', 'seurat',
  'albers', 'vasarely', 'riley', 'molnar', 'mohr', 'nake', 'noll', 'lewitt',
]

/**
 * A speakable seed like "quiet-rothko-41" — easier to read aloud, remember and
 * spot in a URL than a raw hex string.
 *
 * Pass an rng to draw the words deterministically instead: the opening panel
 * needs a seed per piece that is the same on every visit, so the thumbnail a
 * card shows is the piece clicking it opens.
 */
export function randomSeed(rng = null) {
  const float = rng ? rng.float : Math.random
  const pick = (list) => list[Math.floor(float() * list.length)]
  return `${pick(ADJECTIVES)}-${pick(ARTISTS)}-${Math.floor(float() * 100)}`
}

/**
 * How many seeds randomSeed can produce.
 *
 * Derived rather than written down, for the reason the About page gives about
 * its other counts: a number typed out here is wrong the first time a word is
 * added to either list and nobody thinks to look. The 100 is the numeric tail
 * randomSeed appends, and it is the one part of this that has to stay in step
 * by hand — it is written once, directly above.
 */
export const SEED_COUNT = ADJECTIVES.length * ARTISTS.length * 100
