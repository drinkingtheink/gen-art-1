/**
 * Generating a scene off the main thread.
 *
 * Generators were always pure functions of (params, seeded rng) that never
 * touch the DOM, so there is nothing to port — the same module that runs in
 * the component runs here untouched.
 *
 * Only pieces marked `heavy` are sent this way. Differential growth simulates
 * ~158,000 node-steps against a spatial grid, which is about 130ms of solid
 * arithmetic; run inline it blocks paint and input for that whole time.
 */

import { createRng } from '../core/rng.js'
import { getGenerator } from '../generators/index.js'

self.onmessage = ({ data }) => {
  const { token, generatorId, params, seed, width, height, palette } = data
  try {
    const scene = getGenerator(generatorId).generate({
      params,
      rng: createRng(seed),
      width,
      height,
      palette,
    })
    self.postMessage({ token, scene })
  } catch (error) {
    // The caller falls back to generating inline, so a failure here costs a
    // frame rather than the piece.
    self.postMessage({ token, error: String(error?.message ?? error) })
  }
}
