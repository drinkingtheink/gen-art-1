import { computed, ref, watch } from 'vue'
import { coerce, coerceAll, defaultsFor } from '../core/params.js'
import {
  applyTreatment,
  coerceTreatment,
  getPalette,
  paletteAtCycle,
  paletteIdAtCycle,
  randomPaletteId,
} from '../core/palettes.js'
import { createRng, randomSeed } from '../core/rng.js'
import { paramsAt } from '../core/showcase.js'
import { useFlicker } from '../composables/useFlicker.js'
import { buildEffects, coerceEffects } from '../core/effects.js'
import { buildGrain, coerceGrain } from '../core/grain.js'
import { getRatio } from '../core/ratios.js'
import { getGenerator } from '../generators/index.js'

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

  // Grain sits over the finished piece rather than inside it, so it's canvas
  // state like the shape — generators never see it.
  const grain = ref(coerceGrain(initial.grain))

  // How the chosen palette is used, as opposed to which one it is. Canvas
  // state, because it applies to whatever piece is on screen.
  const treatment = ref(coerceTreatment(initial.treatment))

  // Bloom, chromatic aberration and vignette. Canvas state like the grain.
  const effects = ref(coerceEffects(initial.effects))

  const seed = ref(initial.seed || randomSeed())
  const params = ref(coerceAll(generator.value, initial.params))

  // Showcase mode, when running, replaces the params and palette for the
  // current instant. Everything downstream — export, permalink, the stage —
  // is unchanged by it, because a modulated frame is just another set of
  // params through the same pure generator.
  const showcase = ref(null)

  const livedParams = computed(() => {
    const s = showcase.value
    if (!s?.active) return params.value

    const modulated = paramsAt(s.time, params.value, s.modulators, generator.value.params, s.intensity)

    // Ease in from wherever the piece was sitting. At ramp 0 this returns the
    // still params exactly, so play starts from the frame already on screen
    // instead of cutting to the preset's values.
    const ramp = s.ramp ?? 1
    if (ramp >= 1) return modulated

    const eased = ramp * ramp * (3 - 2 * ramp)
    const blended = { ...modulated }
    for (const spec of generator.value.params) {
      if (spec.type !== 'range') continue
      const from = params.value[spec.key]
      const to = modulated[spec.key]
      if (typeof from === 'number' && typeof to === 'number') {
        blended[spec.key] = from + (to - from) * eased
      }
    }
    return blended
  })

  /**
   * The palette generators actually receive.
   *
   * Showcase cycling picks the base set, then treatment decides how it's used,
   * so the two compose: a cycling piece keeps its background choice and muting
   * as it moves through the palettes.
   */
  /**
   * The palette before treatment — what the swatch UI shows, so clicking a
   * colour means that colour rather than whatever treatment turned it into.
   */
  const basePalette = computed(() => {
    const s = showcase.value
    // The cycle walks *from* the chosen palette, so picking one mid-playback
    // takes effect immediately and the cycle carries on from there.
    return s?.active && s.cyclePalette
      ? paletteAtCycle(s.palettePosition, params.value.palette)
      : getPalette(params.value.palette)
  })

  const livedPalette = computed(() => applyTreatment(basePalette.value, treatment.value))


  /**
   * What the stage renders.
   *
   * A computed, and generate() is pure with a freshly seeded rng each run, so
   * the same seed and params always give the same picture — and Vue skips the
   * work entirely when nothing it depends on has changed.
   *
   * Every piece is generated inline, on the main thread. The slowest is the
   * flow field at 10ms and most are under 3, which is inside a frame at the
   * rate showcase drives them, so there is nothing worth deferring.
   */
  const scene = computed(() =>
    generator.value.generate({
      params: livedParams.value,
      rng: createRng(seed.value),
      width: canvas.value.width,
      height: canvas.value.height,
      palette: livedPalette.value,
    }),
  )

  /** Showcase feeds its live state in here each frame. */
  function setShowcase(state) {
    showcase.value = state
  }

  /**
   * Freeze what's on screen into the params.
   *
   * Without this, pausing drops back to the base params and the piece visibly
   * jumps — and the panel never showed what you were actually looking at, so
   * a link copied mid-playback reproduced something else. Called on pause, so
   * the paused frame is a piece in its own right: sliders, permalink and
   * canvas all agreeing.
   *
   * The palette is the one thing that can't be captured exactly. A cycling
   * piece shows a blend of two sets and a blend has no id, so this snaps to
   * whichever it's nearer.
   */
  function commitLive() {
    const s = showcase.value
    if (!s?.active) return

    // livedParams is exactly what the stage is drawing, ramp and all —
    // recomputing the modulation here would miss the ease-in and put a jump
    // back on pause.
    const frozen = livedParams.value
    const palette = s.cyclePalette
      ? paletteIdAtCycle(s.palettePosition, params.value.palette)
      : params.value.palette

    // Neither snapped to slider steps nor rounded at all.
    //
    // Snapping was the original bug — modulation runs continuous, so rounding
    // to a step shifts the piece off the frame being paused on. Rounding to
    // even 5 decimals is no better: the attractor iterates a chaotic map
    // 26,000 times, and a 1e-5 change in its constants moved points by 956
    // units. Full precision makes a permalink longer; it also makes it exact.
    params.value = coerceAll(generator.value, { ...frozen, palette }, { snap: false })
  }

  /**
   * Static bursts run on their own clock rather than the showcase one.
   *
   * Tying them to showcase meant they only fired during playback, so a piece
   * sitting still showed static permanently — which is exactly what
   * interference shouldn't do. The clock only runs while static is on and
   * bursting, so a piece without it costs nothing.
   *
   * Rebuilding the effects layer is a handful of nodes; the artwork is never
   * regenerated by it.
   */
  const flickering = computed(
    () => effects.value.interference > 0 && effects.value.interferenceBurst > 0,
  )
  const flickerTime = useFlicker(flickering)

  const built = computed(() =>
    buildEffects(
      effects.value,
      seed.value,
      canvas.value.width,
      canvas.value.height,
      flickerTime.value,
    ),
  )

  // Vignette sits under the grain, so grain textures the vignette too.
  const overlay = computed(() => [
    ...built.value.overlay,
    ...buildGrain(grain.value, seed.value, canvas.value.width, canvas.value.height),
  ])

  const defs = computed(() => built.value.defs)
  const artworkFilter = computed(() => built.value.filterId ?? '')

  function setEffects(patch) {
    effects.value = coerceEffects({ ...effects.value, ...patch })
  }

  function setTreatment(patch) {
    treatment.value = coerceTreatment({ ...treatment.value, ...patch })
  }

  function setGrain(patch) {
    grain.value = coerceGrain({ ...grain.value, ...patch })
  }

  /** Set one param, coerced against its spec. Unknown keys are ignored. */
  function setParam(key, value) {
    const spec = generator.value.params.find((p) => p.key === key)
    if (!spec) return
    params.value = { ...params.value, [key]: coerce(spec, value) }
  }

  /**
   * Switch generators, starting from that generator's own defaults — except
   * the palette, which is rolled.
   *
   * Each piece was authored in one set, so every piece appeared to come in one
   * colour: truchet was the flame piece, dendrite the green one. The sets are
   * all general-purpose and there are fifty of them, and which one a piece
   * happens to have been written in says nothing about which one suits it.
   *
   * Never the set already on screen, so the change always reads as a change.
   */
  function selectGenerator(id) {
    const next = getGenerator(id)
    if (next.id === generatorId.value) return
    generatorId.value = next.id
    const wants = next.params.some((spec) => spec.type === 'palette')
    params.value = {
      ...defaultsFor(next),
      ...(wants ? { palette: randomPaletteId(params.value.palette) } : null),
    }
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

  function regen() {
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
    grain.value = coerceGrain(state.grain)
    effects.value = coerceEffects(state.effects)
    treatment.value = coerceTreatment(state.treatment)
    if (state.seed) seed.value = state.seed
    params.value = coerceAll(next, state.params)
  }

  return {
    generatorId,
    generator,
    ratioId,
    canvas,
    grain,
    effects,
    defs,
    artworkFilter,
    treatment,
    basePalette,
    livedPalette,
    overlay,
    seed,
    params,
    livedParams,
    scene,
    setShowcase,
    commitLive,
    setParam,
    selectGenerator,
    setRatio,
    setGrain,
    setEffects,
    setTreatment,
    setSeed,
    regen,
    resetParams,
    applyState,
  }
}
