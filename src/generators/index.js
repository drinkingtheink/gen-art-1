import attractor from './attractor.js'
import canopy from './canopy.js'
import contour from './contour.js'
import flowField from './flowField.js'
import growth from './growth.js'
import halftone from './halftone.js'
import harmonograph from './harmonograph.js'
import moire from './moire.js'
import strata from './strata.js'
import subdivision from './subdivision.js'
import truchet from './truchet.js'
import weave from './weave.js'

/**
 * The registry. Adding a piece of art is an import and an entry here —
 * controls, seeding and permalinks come for free from the schema.
 */
export const generators = [
  subdivision,
  flowField,
  truchet,
  growth,
  moire,
  harmonograph,
  attractor,
  canopy,
  strata,
  halftone,
  contour,
  weave,
]

export const generatorById = Object.fromEntries(generators.map((g) => [g.id, g]))

/** Look up a generator, falling back to the first rather than returning undefined. */
export function getGenerator(id) {
  return generatorById[id] ?? generators[0]
}
