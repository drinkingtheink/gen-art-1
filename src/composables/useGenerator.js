import { computed, ref, watch } from 'vue'
import { coerce, coerceAll, defaultsFor } from '../core/params.js'
import {
  applyTreatment,
  coerceTreatment,
  getPalette,
  paletteAtCycle,
  paletteIdAtCycle,
  randomBackground,
} from '../core/palettes.js'
import { randomParams } from '../core/random.js'
import { createRng, randomSeed } from '../core/rng.js'
import { paramsAt } from '../core/showcase.js'
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

  const built = computed(() =>
    buildEffects(
      effects.value,
      seed.value,
      canvas.value.width,
      canvas.value.height,
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
   * the palette, which is carried across.
   *
   * This used to roll a new set, and the reason was real: each piece was
   * authored in one palette, so every piece arrived in one colour — truchet
   * was the flame piece, dendrite the green one — and which set a generator
   * happens to have been written in says nothing about which suits it.
   *
   * Carrying the current set solves that just as well and answers the question
   * people actually have here, which is what the palette they just chose looks
   * like on something else. Rolling made that impossible: the one thing you
   * were holding onto was the one thing the change threw away. The authored
   * default still shows, once, on whichever generator the session opens with.
   *
   * Every generator draws its palette options from the same global list, so a
   * set carried from one is always valid on the next.
   *
   * No background roll here either, and that is the same rule rather than an
   * exception to it: the background is rolled when a *new* palette arrives,
   * and nothing new has arrived.
   *
   * The palette cycle keeps its timer through this for free. It is re-anchored
   * by a watcher on the palette param, so leaving that param alone leaves the
   * cycle where it was — a piece swapped mid-cycle lands on the colour the
   * clock had already walked to, rather than snapping back to the start.
   */
  function selectGenerator(id) {
    const next = getGenerator(id)
    if (next.id === generatorId.value) return
    generatorId.value = next.id
    const wants = next.params.some((spec) => spec.type === 'palette')
    const carried = wants ? params.value.palette : null
    params.value = {
      ...defaultsFor(next),
      ...(carried ? { palette: carried } : null),
    }
  }

  /**
   * Choose a palette, and draw a background out of it.
   *
   * The background is held as an index, so carrying it across a change of
   * palette gave colour three of whatever arrived next — the same slot, which
   * is not the same intention. Sets here run quiet to loud, so slot three is a
   * different kind of colour in every one of them, and the piece came out
   * wearing the old scheme's habits. Rolling it makes a new palette read as a
   * new scheme.
   *
   * Deliberately not a watcher on the palette param. applyState writes that
   * param too, and a permalink that rerolled its own background on arrival
   * would not be a permalink.
   */
  function rollBackground(paletteId) {
    treatment.value = coerceTreatment({
      ...treatment.value,
      bg: randomBackground(getPalette(paletteId)),
    })
  }

  function selectPalette(id) {
    const before = params.value.palette
    setParam('palette', id)
    // setParam coerces against the spec, so this is also the check that the
    // id was one the generator accepts.
    if (params.value.palette !== before) rollBackground(params.value.palette)
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

  /**
   * Re-gen: the same piece, rolled again.
   *
   * A new seed on its own only reshuffles what the generator draws from the
   * same numbers, so pressing it gave another arrangement of one idea — the
   * grid stayed 12, the margin stayed 30, and twenty presses produced twenty
   * variations of the same picture. It rolls the params as well now, which is
   * what makes it a re-generation rather than a reshuffle.
   *
   * The palette is held, and held properly: it is handed to randomParams so
   * the colour params are drawn against it, not stamped over the top
   * afterwards. Generator and shape are held too — changing those is what the
   * piece picker and Randomized piece are for, and this is the button for
   * staying where you are.
   *
   * Params come off the new seed rather than Math.random, so the roll is a
   * function of a seed like everything else here. That is not the same as the
   * seed being enough to rebuild the piece: typing one back into the field
   * sets the seed and leaves the params where they are, because setSeed does
   * not re-roll. The permalink is what carries a piece, as it always was.
   */
  function regen() {
    const next = randomSeed()
    seed.value = next
    params.value = coerceAll(
      generator.value,
      randomParams(generator.value, createRng(`regen:${next}`), params.value.palette),
    )
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
    selectPalette,
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
