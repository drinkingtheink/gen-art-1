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
import { getPalette } from './palettes.js'
import { createRng, randomSeed } from './rng.js'
import { getRatio } from './ratios.js'
import { renderSvg } from './svg.js'
import { generators } from '../generators/index.js'

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
