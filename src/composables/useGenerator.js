import { computed, ref } from 'vue'
import { coerce, coerceAll, defaultsFor } from '@/core/params.js'
import { createRng, randomSeed } from '@/core/rng.js'
import { getRatio } from '@/core/ratios.js'
import { getGenerator } from '@/generators/index.js'

/**
 * The piece currently on the stage: which generator, what seed, what params.
 *
 * `scene` is a computed, and generate() is pure with a freshly seeded rng each
 * run, so the same seed and params always yield the same picture — and Vue
 * skips the work entirely when nothing changed.
 */

export function useGenerator(initial = {}) {
  const generatorId = ref(getGenerator(initial.generatorId).id)
  const generator = computed(() => getGenerator(generatorId.value))

  // The art is authored in a fixed coordinate space and scaled by CSS, so
  // output is resolution-independent and a seed looks the same on any screen.
  // Ratios hold area constant, so a margin or a grid count means the same
  // density whatever the shape.
  const ratioId = ref(getRatio(initial.ratioId).id)
  const canvas = computed(() => getRatio(ratioId.value))

  const seed = ref(initial.seed || randomSeed())
  const params = ref(coerceAll(generator.value, initial.params))

  const scene = computed(() =>
    generator.value.generate({
      params: params.value,
      rng: createRng(seed.value),
      width: canvas.value.width,
      height: canvas.value.height,
    }),
  )

  /** Set one param, coerced against its spec. Unknown keys are ignored. */
  function setParam(key, value) {
    const spec = generator.value.params.find((p) => p.key === key)
    if (!spec) return
    params.value = { ...params.value, [key]: coerce(spec, value) }
  }

  /** Switch generators, starting from that generator's own defaults. */
  function selectGenerator(id) {
    const next = getGenerator(id)
    if (next.id === generatorId.value) return
    generatorId.value = next.id
    params.value = defaultsFor(next)
  }

  /**
   * Switching shape re-runs generate() on the new canvas with the same seed —
   * the piece is regenerated, not reflowed.
   */
  function setRatio(id) {
    ratioId.value = getRatio(id).id
  }

  function setSeed(value) {
    const trimmed = String(value).trim()
    if (trimmed) seed.value = trimmed
  }

  function reroll() {
    seed.value = randomSeed()
  }

  function resetParams() {
    params.value = defaultsFor(generator.value)
  }

  /** Apply a whole state at once — how a permalink gets loaded. */
  function applyState(state = {}) {
    const next = getGenerator(state.generatorId)
    generatorId.value = next.id
    ratioId.value = getRatio(state.ratioId).id
    if (state.seed) seed.value = state.seed
    params.value = coerceAll(next, state.params)
  }

  return {
    generatorId,
    generator,
    ratioId,
    canvas,
    seed,
    params,
    scene,
    setParam,
    selectGenerator,
    setRatio,
    setSeed,
    reroll,
    resetParams,
    applyState,
  }
}
