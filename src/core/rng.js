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

const NOUNS = [
  'heron', 'lantern', 'meadow', 'signal', 'harbor', 'thistle', 'orbit', 'kiln',
  'marrow', 'atlas', 'fathom', 'pylon', 'moth', 'quarry', 'cinder', 'wren',
  'gable', 'current', 'vesper', 'ledger', 'plume', 'anvil', 'fern', 'compass',
]

/**
 * A speakable seed like "quiet-heron-41" — easier to read aloud, remember and
 * spot in a URL than a raw hex string.
 */
export function randomSeed() {
  const pick = (list) => list[Math.floor(Math.random() * list.length)]
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${Math.floor(Math.random() * 100)}`
}
