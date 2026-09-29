/**
 * A whole piece chosen by chance: which generator, which shape, which params.
 *
 * The entire choice derives from one word-seed, so a randomised piece is
 * reproducible from that seed alone — and the rng it draws on is namespaced
 * away from the one the art itself uses, so the params picked and the
 * composition made from them don't share a sequence.
 *
 * Range params are drawn uniformly and then pulled part of the way back toward
 * the authored default. Left fully uniform, every param lands near an extreme
 * about as often as anywhere else, and a piece needs only one or two of those
 * at once — a margin at 140, a count at its minimum, opacity at 0.05 — to come
 * out blank. The pull is stronger on params flagged `structural`, which decide
 * whether there is anything on the page at all, and weaker on the rest, which
 * only decide how it looks. Every value in the range stays reachable either
 * way; they just stop arriving all at once.
 */

import { coerce } from './params.js'
import { getPalette } from './palettes.js'
import { ratios } from './ratios.js'
import { createRng, randomSeed } from './rng.js'
import { generators } from '../generators/index.js'

const STRUCTURAL_PULL = 0.45
const PLAIN_PULL = 0.2

function randomValue(spec, rng, palette) {
  switch (spec.type) {
    case 'range': {
      const pull = spec.structural ? STRUCTURAL_PULL : PLAIN_PULL
      const drawn = rng.range(spec.min, spec.max)
      // coerce() clamps and snaps to the param's own step, so the result is
      // indistinguishable from a value the slider could have produced.
      return coerce(spec, spec.default + (drawn - spec.default) * (1 - pull))
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
 * has to be chosen against the set it will sit in, not before it.
 */
export function randomParams(generator, rng) {
  const paletteSpec = generator.params.find((spec) => spec.type === 'palette')
  const paletteId = paletteSpec ? rng.pick(paletteSpec.options).value : null
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
 * bloom, static and aberration reads as a broken render rather than as a
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
