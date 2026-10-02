/**
 * A whole piece chosen by chance: which generator, which shape, which params.
 *
 * The entire choice derives from one word-seed, so a randomised piece is
 * reproducible from that seed alone — and the rng it draws on is namespaced
 * away from the one the art itself uses, so the params picked and the
 * composition made from them don't share a sequence.
 *
 * A range param is drawn from a window centred on its authored default, `wander`
 * wide as a fraction of the full range. At 1 that is the whole range; below it
 * the roll still moves the param substantially but keeps it in the company of
 * the other twelve, which is what makes the result read as a piece rather than
 * as thirteen independent extremes.
 *
 * The defaults here are deliberately loose, because most generators don't need
 * protecting: rolled fully uniform, fifteen of the eighteen pieces that existed
 * when this was measured produce something worth looking at essentially every
 * time. The exceptions are the pieces whose
 * params decide whether there is a figure at all — a chaotic map's constants, a
 * line width that reaches zero, an amplitude that collapses to a dot — and
 * those declare a `wander` of their own, next to the param it protects.
 *
 * Measured by rasterising 1,080 rolls of each and counting the ones that mark
 * less than 2% of the canvas, that takes blank results from 10.6% to 4.4% —
 * and what's left is mostly sparse rather than empty.
 */

import { coerce } from './params.js'
import { getPalette } from './palettes.js'
import { ratios } from './ratios.js'
import { createRng, randomSeed } from './rng.js'
import { generators } from '../generators/index.js'

/** Params flagged `structural` decide how much work is on the page, so they move less. */
const STRUCTURAL_WANDER = 0.6
const WANDER = 0.85

/**
 * The window a value is drawn from: `wander` of the range, centred on the
 * default, slid back inside the bounds rather than clipped against them — a
 * param whose default sits on its minimum would otherwise return that minimum
 * half the time.
 */
function windowFor(spec) {
  const span = (spec.max - spec.min) * (spec.wander ?? (spec.structural ? STRUCTURAL_WANDER : WANDER))
  let low = spec.default - span / 2
  let high = spec.default + span / 2
  if (low < spec.min) high += spec.min - low
  if (high > spec.max) low -= high - spec.max
  return [Math.max(low, spec.min), Math.min(high, spec.max)]
}

function randomValue(spec, rng, palette) {
  switch (spec.type) {
    case 'range': {
      const [low, high] = windowFor(spec)
      // coerce() clamps and snaps to the param's own step, so the result is
      // indistinguishable from a value the slider could have produced.
      return coerce(spec, rng.range(low, high))
    }
    case 'select':
    case 'palette':
      return rng.pick(spec.options).value
    // A hex drawn at random is as likely to vanish into the paper as to suit
    // the piece. One of the palette's own inks always belongs with the rest.
    case 'color':
      return rng.pick(palette.colors)
    case 'toggle':
      return rng.bool()
    default:
      return spec.default
  }
}

/**
 * A random, valid param set for one generator.
 *
 * The palette is settled first because colour params draw from it — a stroke
 * has to be chosen against the set it will sit in, not before it. Pass
 * `keepPalette` to hold a set and roll everything else against it, which is
 * what Re-gen does.
 */
export function randomParams(generator, rng, keepPalette = null) {
  const paletteSpec = generator.params.find((spec) => spec.type === 'palette')
  const paletteId = keepPalette ?? (paletteSpec ? rng.pick(paletteSpec.options).value : null)
  // Not only what the palette param is set to. Colour params draw *from* the
  // set, so a kept palette has to be the one they are drawn against too —
  // rolling against a random set and then overwriting the id afterwards would
  // leave every stroke colour belonging to a palette that is no longer there.
  const palette = getPalette(paletteId)

  return Object.fromEntries(
    generator.params.map((spec) => [
      spec.key,
      spec === paletteSpec ? paletteId : randomValue(spec, rng, palette),
    ]),
  )
}

/**
 * A complete piece, in the shape applyState() and the permalink expect.
 *
 * Grain and effects are deliberately absent, so they land on their defaults.
 * They sit over the finished piece rather than in it, and a random pile of
 * bloom, scanlines and aberration reads as a broken render rather than as a
 * choice — what's being rolled here is the artwork.
 */
export function randomState(seed = randomSeed()) {
  const rng = createRng(`chance:${seed}`)
  const generator = rng.pick(generators)

  return {
    generatorId: generator.id,
    ratioId: rng.pick(ratios).id,
    seed,
    params: randomParams(generator, rng),
  }
}
