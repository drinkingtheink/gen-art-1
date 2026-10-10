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
 * The shape is asked for rather than fixed. Square is what every piece was
 * authored at and what a grid of cards wants, and it is what the panel uses
 * wherever there is room for a grid. A phone has room for one column, and a
 * square there opens a square — so the shape travels with the card, because
 * the card is the piece and the two cannot disagree.
 */

import { defaultsFor } from './params.js'
import { getPalette, palettes, randomPaletteId } from './palettes.js'
import { createRng, randomSeed } from './rng.js'
import { getRatio } from './ratios.js'
import { presetFor } from './showcase.js'
import { renderSvg } from './svg.js'
import { generators, getGenerator } from '../generators/index.js'

/**
 * Everything about a card except the shape, settled once per visit.
 *
 * The palette roll lives here rather than in `launchPiecesFor` precisely
 * because that function is called again when the window crosses the
 * breakpoint: rolled there, turning a phone on its side would recolour all
 * twenty pieces as a side effect of reshaping them.
 */
const CARDS = generators.map((generator) => ({
  generator,
  seed: randomSeed(createRng(`launch:${generator.id}`)),
  params: { ...defaultsFor(generator), palette: randomPaletteId() },
}))

/** The panel's offer, at one canvas shape. */
export function launchPiecesFor(ratioId = 'square') {
  const shape = getRatio(ratioId).id
  return CARDS.map(({ generator, seed, params }) => ({
    generator,
    state: { generatorId: generator.id, ratioId: shape, seed, params },
  }))
}

/**
 * A standalone SVG document for one card.
 *
 * Deliberately a string from the DOM-free serialiser rather than a live node
 * tree: the panel hands each one to an `<img>`, which rasterises it once and
 * keeps its ids and gradients in a document of its own. Inlining them all in
 * one page would put every piece's clip-path ids in one namespace, and cost
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
 * splits them cleanly: attractor, phyllotaxis, harmonograph and dendrite all
 * measure 0%, because they compose a single figure in the middle and leave
 * plain background either side. Behind a full-width panel that reads as a
 * blank screen with something small happening in the centre. Blocks manages
 * only 5% for the same reason.
 *
 * Rosette used to be in that list and is not any more. It is still a single
 * figure, but the figure is now bigger than the page it is on, so what fills
 * the frame is a crop out of the middle of it rather than a medallion with
 * space either side. It is the only piece here that needs more than a zero
 * margin to bleed, and it declares what it needs below.
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
 *
 * Rosette measures sparser than any of them and still qualifies. On one run of
 * the same test it holds 20–28% of the edge columns across the full swing of
 * the petal modulator, against 41% for truchet and 32% for packing measured
 * the same way — but it marks ink in 100% of the edge *rows* at every point in
 * that swing, so what is out there is an open lattice rather than a gap. It is
 * also the cheapest piece in the set, at 0.7–1.3ms and 28KB a frame.
 */

/**
 * `bleed` is the params a backdrop pins, over the generator's own defaults.
 *
 * Every piece here keeps a margin of background colour by default, which on a
 * backdrop is just a border around the screen, so zero margin is the bleed
 * they all share. Rosette needs two more: a reach that puts the figure well
 * past the frame, and every ring it has, because a crop out of a nine-ring
 * window has something crossing the edges and a crop out of a six-ring one
 * runs out of bands before it gets there.
 */
const BACKDROP_PIECES = [
  { id: 'subdivision' },
  { id: 'strata' },
  { id: 'cells' },
  { id: 'packing' },
  { id: 'truchet' },
  { id: 'rosette', bleed: { reach: 2.2, rings: 9 } },
]

export function backdropPiece(rng = createRng(randomSeed())) {
  const choice = rng.pick(BACKDROP_PIECES)
  const generator = getGenerator(choice.id)
  const bleed = { margin: 0, ...choice.bleed }

  const params = { ...defaultsFor(generator), palette: rng.pick(palettes).id, ...bleed }

  return {
    generator,
    params,
    seed: randomSeed(rng),
    // A modulator on a pinned param would unpin it within a second of
    // playback: truchet's preset sweeps margin between 18 and 102, so the
    // border this just removed would breathe back in. That is true of every
    // param the bleed sets, not only of margin, so the whole set goes.
    modulators: presetFor(generator).filter((m) => !(m.key in bleed)),
  }
}
