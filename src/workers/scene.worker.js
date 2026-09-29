/**
 * Generating a scene off the main thread.
 *
 * Generators were always pure functions of (params, seeded rng) that never
 * touch the DOM, so there is nothing to port — the same module that runs in
 * the component runs here untouched.
 *
 * Only pieces marked `heavy` are sent this way, which at present is none of
 * them — this was built for differential growth, a simulation costing ~130ms a
 * frame, and that piece has been replaced by one that recurses instead. It is
 * the route for the next generator whose cost is time-stepped rather than
 * proportional to what it draws.
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
