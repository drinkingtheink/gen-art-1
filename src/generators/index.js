import attractor from './attractor.js'
import blocks from './blocks.js'
import cells from './cells.js'
import chladni from './chladni.js'
import contour from './contour.js'
import cove from './cove.js'
import dendrite from './dendrite.js'
import flowField from './flowField.js'
import glyphs from './glyphs.js'
import halftone from './halftone.js'
import inversion from './inversion.js'
import harmonograph from './harmonograph.js'
import lens from './lens.js'
import moire from './moire.js'
import packing from './packing.js'
import penrose from './penrose.js'
import phyllotaxis from './phyllotaxis.js'
import rosette from './rosette.js'
import strata from './strata.js'
import subdivision from './subdivision.js'
import truchet from './truchet.js'

/**
 * The registry. Adding a piece of art is an import and an entry here —
 * controls, seeding and permalinks come for free from the schema.
 */
export const generators = [
  subdivision,
  flowField,
  truchet,
  dendrite,
  moire,
  harmonograph,
  attractor,
  strata,
  halftone,
  contour,
  cove,
  chladni,
  lens,
  blocks,
  packing,
  penrose,
  inversion,
  rosette,
  glyphs,
  cells,
  phyllotaxis,
]

export const generatorById = Object.fromEntries(generators.map((g) => [g.id, g]))

/** Look up a generator, falling back to the first rather than returning undefined. */
export function getGenerator(id) {
  return generatorById[id] ?? generators[0]
}
