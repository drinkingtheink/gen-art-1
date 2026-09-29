/**
 * A piece rendered from nothing but its URL — no browser, no build step.
 *
 * This is the whole reason permalinks encode every param explicitly: the art
 * is a pure function of the link, so a server handed the link can reproduce
 * the exact image without ever having stored one. Used for link previews.
 */

import { decodeState } from './permalink.js'
import { coerceAll } from './params.js'
import { applyTreatment, coerceTreatment, getPalette } from './palettes.js'
import { createRng } from './rng.js'
import { getRatio } from './ratios.js'
import { renderSvg } from './svg.js'
import { getGenerator } from '../generators/index.js'

/** Open Graph's standard card, and the shape every scraper crops best from. */
export const CARD = { width: 1200, height: 630 }

/**
 * The card for a link that names no piece — the site's own front door.
 *
 * It has to be a fixed piece rather than a random one. The image is served
 * immutable, so a random seed here would mean the first request to arrive
 * decides the site's preview image permanently. This one is chosen: a wide
 * flow field, which reads well at card size.
 */
const SITE_DEFAULT = { g: 'flow-field', r: 'wide', s: 'quiet-heron-41' }

/**
 * The words on that card.
 *
 * A bare URL is a page in its own right now that it opens the picker rather
 * than dropping into a piece, so it is worth describing as one. Kept here
 * because the edge function needs the same copy index.html carries — that copy
 * is the last-resort fallback for when this layer fails, and the two drifting
 * apart would mean a card that changed depending on whether it worked.
 */
export const SITE_CARD = {
  title: 'gen\u00b7art \u2014 generative SVG studio',
  description:
    'Eighteen generative art pieces rendered as real SVG. Seeded and reproducible, ' +
    'animated for screen capture, exportable as vector or high-resolution PNG.',
  alt: 'A generative artwork rendered as vector line work',
}
const SITE_DEFAULT_STATE = {
  generatorId: SITE_DEFAULT.g,
  ratioId: SITE_DEFAULT.r,
  seed: SITE_DEFAULT.s,
  params: {},
}

/**
 * Everything a link says about itself, without drawing anything.
 *
 * Split out from the render because the edge function that writes the meta
 * tags needs the words and not the picture, and generating a piece it would
 * throw away is the most expensive thing it could do.
 */
export function previewMeta(search) {
  // A link that names a piece gets that piece and nothing else: falling back
  // field by field would hand a ratio-less link the site default instead of
  // the square every piece was authored at, and silently reshape old links.
  const state = decodeState(search) ?? {}
  const named = state.generatorId ? state : SITE_DEFAULT_STATE

  const generator = getGenerator(named.generatorId)
  const ratio = getRatio(named.ratioId)
  const seed = named.seed || SITE_DEFAULT.s
  const params = coerceAll(generator, named.params)
  const palette = getPalette(params.palette)
  const shape = ratio.label.split(' \u00b7 ')[0].toLowerCase()

  return {
    generator,
    ratio,
    seed,
    params,
    state: named,
    title: `${generator.name} \u00b7 ${seed}`,
    description:
      `A generative ${generator.name.toLowerCase()} piece in ${palette.name}, ${shape} format. ` +
      `Open it to change every parameter and re-gen from a new seed.`,
  }
}

/**
 * Resolve URL state into an SVG document.
 *
 * Grain and effects are deliberately left out. They are SVG filters, and the
 * rasteriser on the other end of this supports filters only partially — a
 * preview that silently differs from the page is worse than one that is
 * honestly just the artwork. Everything that defines the piece (generator,
 * seed, params, palette, treatment, ratio) is here.
 */
export function renderPreview(search, { frame = CARD } = {}) {
  const meta = previewMeta(search)
  const palette = applyTreatment(getPalette(meta.params.palette), coerceTreatment(meta.state.treatment))

  const scene = meta.generator.generate({
    params: meta.params,
    rng: createRng(meta.seed),
    width: meta.ratio.width,
    height: meta.ratio.height,
    palette,
  })

  return { ...meta, palette, svg: renderSvg(scene, { frame }) }
}
