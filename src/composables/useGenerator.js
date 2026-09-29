import { computed, ref, watch, watchEffect } from 'vue'
import { coerce, coerceAll, defaultsFor } from '../core/params.js'
import {
  applyTreatment,
  coerceTreatment,
  getPalette,
  paletteAtCycle,
  paletteIdAtCycle,
} from '../core/palettes.js'
import { createRng, randomSeed } from '../core/rng.js'
import { paramsAt } from '../core/showcase.js'
import { useFlicker } from '../composables/useFlicker.js'
import { useSceneWorker } from '../composables/useSceneWorker.js'
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
   * What the stage renders, and how it gets there.
   *
   * Most pieces are placements and generate in a few milliseconds, so they are
   * built inline and the scene is up to date before the next paint.
   *
   * A piece marked `heavy` is generated in a worker instead, and the previous
   * scene stays on screen until the new one lands. The work costs the same; it
   * just no longer happens where it can block paint and input.
   *
   * Nothing sets the flag at present. It was built for differential growth,
   * a simulation costing ~130ms a frame, which has since been replaced by
   * dendrite — same family of form, reached by recursion in ~6ms. The path is
   * kept for the next piece that simulates; it costs nothing while unused,
   * since the worker is only constructed on the first heavy request.
   */
  const worker = useSceneWorker()

  function composeScene(params, palette) {
    return generator.value.generate({
      params,
      rng: createRng(seed.value),
      width: canvas.value.width,
      height: canvas.value.height,
      palette,
    })
  }

  const scene = ref(composeScene(params.value, livedPalette.value))

  // Switching pieces is a discrete choice, and leaving the outgoing piece on
  // screen while the new one computes reads as a bug rather than as latency.
  // Those land inline even when the target is heavy.
  let immediate = false
  watch(generatorId, () => {
    immediate = true
  })

  watchEffect(() => {
    // Read every dependency before any branch, so the effect tracks all of
    // them no matter which path it takes this time.
    const params = { ...livedParams.value }
    const source = livedPalette.value
    const palette = { ...source, colors: [...source.colors] }
    const id = generatorId.value
    const heavy = generator.value.heavy
    const canDefer = worker.available.value

    const inline = () => {
      scene.value = composeScene(params, palette)
    }

    if (!heavy || !canDefer || immediate) {
      immediate = false
      inline()
      return
    }

    worker.request(
      { generatorId: id, params, seed: seed.value, width: canvas.value.width, height: canvas.value.height, palette },
      (next) => {
        scene.value = next
      },
      inline,
    )
  })

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
    reroll,
    resetParams,
    applyState,
  }
}
