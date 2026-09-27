/**
 * Seeded 2D simplex noise.
 *
 * The permutation table is shuffled from the generator's rng, so the field is
 * part of the piece: same seed, same landscape. Nothing here reads
 * Math.random.
 */

const F2 = 0.5 * (Math.sqrt(3) - 1)
const G2 = (3 - Math.sqrt(3)) / 6

// 8 gradients around the circle, indexed by 3 bits of the hash.
const GRAD_X = [1, -1, 1, -1, 1, -1, 0, 0]
const GRAD_Y = [1, 1, -1, -1, 0, 0, 1, -1]

export function createNoise2D(rng) {
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i += 1) p[i] = i
  // Fisher-Yates, drawing from the piece's rng.
  for (let i = 255; i > 0; i -= 1) {
    const j = rng.int(0, i)
    const swap = p[i]
    p[i] = p[j]
    p[j] = swap
  }
  const perm = new Uint8Array(512)
  for (let i = 0; i < 512; i += 1) perm[i] = p[i & 255]

  // Hot path — called hundreds of thousands of times per piece, so the three
  // corner contributions are unrolled rather than looped over an array.
  return function noise2D(xin, yin) {
    const s = (xin + yin) * F2
    const i = Math.floor(xin + s)
    const j = Math.floor(yin + s)
    const t = (i + j) * G2

    const x0 = xin - (i - t)
    const y0 = yin - (j - t)

    const i1 = x0 > y0 ? 1 : 0
    const j1 = x0 > y0 ? 0 : 1

    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2

    const ii = i & 255
    const jj = j & 255

    let n = 0

    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 > 0) {
      const g = perm[ii + perm[jj]] & 7
      t0 *= t0
      n += t0 * t0 * (GRAD_X[g] * x0 + GRAD_Y[g] * y0)
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 > 0) {
      const g = perm[ii + i1 + perm[jj + j1]] & 7
      t1 *= t1
      n += t1 * t1 * (GRAD_X[g] * x1 + GRAD_Y[g] * y1)
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 > 0) {
      const g = perm[ii + 1 + perm[jj + 1]] & 7
      t2 *= t2
      n += t2 * t2 * (GRAD_X[g] * x2 + GRAD_Y[g] * y2)
    }

    return 70 * n
  }
}

/**
 * Stacked octaves. One octave is smooth and rolling; three gives the field
 * eddies and detail at more than one scale.
 */
export function fbm(noise2D, x, y, octaves = 1, lacunarity = 2, gain = 0.5) {
  let amplitude = 1
  let frequency = 1
  let sum = 0
  let norm = 0
  for (let o = 0; o < octaves; o += 1) {
    sum += amplitude * noise2D(x * frequency, y * frequency)
    norm += amplitude
    amplitude *= gain
    frequency *= lacunarity
  }
  return sum / norm
}
