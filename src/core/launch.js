/**
 * What the opening panel offers: one specific piece per generator.
 *
 * Each card is a real piece rather than a picture of one — a fixed seed and
 * that generator's authored defaults — so the thumbnail shown is exactly what
 * clicking it opens. The seed is derived from the generator's id, which makes
 * it stable across visits and across machines without a list of hand-picked
 * seeds to maintain.
 *
 * Thumbnails are square because every piece was authored at 1000x1000, and
 * because a grid of cards wants one shape.
 */

import { defaultsFor } from './params.js'
import { getPalette, palettes } from './palettes.js'
import { createRng, randomSeed } from './rng.js'
import { getRatio } from './ratios.js'
import { presetFor } from './showcase.js'
import { renderSvg } from './svg.js'
import { generators, getGenerator } from '../generators/index.js'

export const launchPieces = generators.map((generator) => ({
  generator,
  state: {
    generatorId: generator.id,
    ratioId: 'square',
    seed: randomSeed(createRng(`launch:${generator.id}`)),
    params: defaultsFor(generator),
  },
}))

/**
 * A standalone SVG document for one card.
 *
 * Deliberately a string from the DOM-free serialiser rather than a live node
 * tree: the panel hands each one to an `<img>`, which rasterises it once and
 * keeps its ids and gradients in a document of its own. Eighteen inline SVGs
 * in one page would be eighteen sets of clip-path ids sharing a namespace, and
 * about two megabytes of live DOM for a screen of thumbnails.
 */
export function renderThumbnail({ generator, state }) {
  const ratio = getRatio(state.ratioId)

  const scene = generator.generate({
    params: state.params,
    rng: createRng(state.seed),
    width: ratio.width,
    height: ratio.height,
    palette: getPalette(state.params.palette),
  })

  return renderSvg(scene)
}

/**
 * Pieces allowed to run as the live backdrop behind the opening panel.
 *
 * Curated on two counts, not one. Generation has to be cheap, because this
 * regenerates every frame while the thumbnail grid is still building — but so
 * does the *markup*, because each frame is also a DOM patch. Measured at
 * 1600x900: attractor and dendrite generate in under 10ms yet emit over 300KB
 * of path data a frame, which is the more expensive half. Everything here is
 * under 2ms and under 60KB, and has a showcase preset worth watching.
 */
const BACKDROP_PIECES = ['rosette', 'phyllotaxis', 'cells', 'truchet', 'lens', 'strata']

/**
 * A random piece for the backdrop, as state plus the motion to run it with.
 *
 * Authored defaults rather than randomised params: a fully random roll can
 * land on a dud, and the one thing this screen cannot do is open on an empty
 * canvas. Only the piece, the seed and the palette vary.
 */
export function backdropPiece(rng = createRng(randomSeed())) {
  const generator = getGenerator(rng.pick(BACKDROP_PIECES))
  const params = { ...defaultsFor(generator), palette: rng.pick(palettes).id }
  return {
    generator,
    params,
    seed: randomSeed(rng),
    modulators: presetFor(generator),
  }
}
