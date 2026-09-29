/**
 * What the opening panel offers: one specific piece per generator.
 *
 * Each card is a real piece rather than a picture of one — a fixed seed and
 * that generator's authored defaults — so the thumbnail shown is exactly what
 * clicking it opens. The seed is derived from the generator's id, which makes
 * it stable across visits and across machines without a list of hand-picked
 * seeds to maintain.
 *
 * The palette is the exception: it is rolled once per visit, so the grid is a
 * different set of colourways each time the panel opens rather than the same
 * wall of pieces in the sets they were written in. It is rolled here, into the
 * state the card carries, precisely so the thumbnail and the click still agree.
 *
 * Thumbnails are square because every piece was authored at 1000x1000, and
 * because a grid of cards wants one shape.
 */

import { defaultsFor } from './params.js'
import { getPalette, palettes, randomPaletteId } from './palettes.js'
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
    params: { ...defaultsFor(generator), palette: randomPaletteId() },
  },
}))

/**
 * A standalone SVG document for one card.
 *
 * Deliberately a string from the DOM-free serialiser rather than a live node
 * tree: the panel hands each one to an `<img>`, which rasterises it once and
 * keeps its ids and gradients in a document of its own. Twenty inline SVGs in
 * one page would be twenty sets of clip-path ids sharing a namespace, and
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
 * The rule is that a backdrop has to reach the edges. Rasterising every piece
 * at 16:9 and measuring ink in the leftmost and rightmost 7% of the frame
 * splits them cleanly: attractor, rosette, phyllotaxis, harmonograph and
 * dendrite all measure 0%, because they compose a single figure in the middle
 * and leave plain background either side. Behind a full-width panel that reads
 * as a blank screen with something small happening in the centre. Blocks
 * manages only 5% for the same reason.
 *
 * What survives is the allover fields, and then only the cheap ones — this
 * regenerates every frame while the thumbnail grid is still building, and each
 * frame is also a DOM patch, so markup size counts as much as generation time.
 * Moire covers the frame well but costs 13.6ms and 304KB a frame; flow field,
 * chladni and contour are both slower and sparser at the edges.
 *
 *   piece        ink   L/R edges     ms    markup
 *   subdivision  99%        99%     0.1       7KB
 *   strata       99%        97%     0.8      42KB
 *   cells        71%        89%     0.9      12KB
 *   packing      53%        53%     2.4      44KB
 *   truchet      57%        50%     0.4      62KB
 */
const BACKDROP_PIECES = ['subdivision', 'strata', 'cells', 'packing', 'truchet']

export function backdropPiece(rng = createRng(randomSeed())) {
  const generator = getGenerator(rng.pick(BACKDROP_PIECES))

  // Full bleed. Every piece keeps a margin of background colour by default,
  // which on a backdrop is just a border around the screen — and truchet's
  // preset sweeps its margin between 18 and 102, so the border would breathe
  // unless that modulator goes too.
  const params = { ...defaultsFor(generator), palette: rng.pick(palettes).id, margin: 0 }

  return {
    generator,
    params,
    seed: randomSeed(rng),
    modulators: presetFor(generator).filter((m) => m.key !== 'margin'),
  }
}
