import { computed, onScopeDispose, ref, shallowRef } from 'vue'

/**
 * Playback clock for showcase mode.
 *
 * Time advances by measured elapsed wall-clock rather than a fixed step, so
 * motion runs at the same speed whatever frame rate the machine manages —
 * a slow frame makes the animation choppier, never slower. That matters when
 * the output is a screen recording.
 */
export function useShowcase() {
  const playing = ref(false)
  const time = ref(0)
  const speed = ref(1)
  const intensity = ref(1)
  const cyclePalette = ref(true)
  const paletteSeconds = ref(14)

  // The clock time the palette cycle counts from. Picking a palette moves this
  // to now, so the chosen set shows at once rather than the cycle carrying on
  // from wherever it happened to be.
  const paletteOrigin = ref(0)

  // Frame rate is the number that decides whether a recording will look good,
  // and it can't be known ahead of time — it depends on the piece, the
  // settings and the machine. So the app measures and reports it.
  /**
   * Seconds spent easing from the still params into the modulated ones.
   *
   * Without it, pressing play swapped the params for the preset's values in a
   * single frame — measured at up to 58% of a param's range in one step, which
   * reads as a blink rather than a start.
   *
   * 1.5s rather than something shorter because the pieces with the largest
   * jumps need the room: truchet's worst single frame during the ease drops
   * from 0.194 to 0.133 between 0.8s and 1.5s, and chladni's from 0.168 to
   * 0.103. Past about 2s it stops helping and only feels sluggish — what's
   * left by then is each piece's own motion, not the ease.
   */
  const RAMP_SECONDS = 1.5
  const rampFrom = ref(0)

  const fps = ref(0)
  const frameMs = ref(0)
  const samples = shallowRef([])

  let raf = null
  let last = 0

  function tick(now) {
    if (!playing.value) return
    const delta = last ? Math.min(0.25, (now - last) / 1000) : 0
    last = now

    if (delta > 0) {
      time.value += delta * speed.value
      const window = samples.value.length >= 30 ? samples.value.slice(-29) : samples.value.slice()
      window.push(delta)
      samples.value = window
      const mean = window.reduce((a, b) => a + b, 0) / window.length
      fps.value = Math.round(1 / mean)
      frameMs.value = Math.round(mean * 1000)
    }

    raf = requestAnimationFrame(tick)
  }

  function play() {
    if (playing.value) return
    // Anchored to now, not to zero: the clock keeps running across a
    // pause/resume, so a fixed origin would put a resume past the ramp and
    // blink again.
    rampFrom.value = time.value
    playing.value = true
    last = 0
    samples.value = []
    raf = requestAnimationFrame(tick)
  }

  function pause() {
    playing.value = false
    if (raf) cancelAnimationFrame(raf)
    raf = null
  }

  function toggle() {
    playing.value ? pause() : play()
  }

  /** 0 at the instant play is pressed, 1 once the motion is at full strength. */
  const rampProgress = computed(() =>
    RAMP_SECONDS <= 0
      ? 1
      : Math.min(1, Math.max(0, (time.value - rampFrom.value) / RAMP_SECONDS)),
  )

  /** Where the palette cycle sits right now, in whole-palette units. */
  const palettePosition = computed(() =>
    cyclePalette.value && paletteSeconds.value > 0
      ? Math.max(0, time.value - paletteOrigin.value) / paletteSeconds.value
      : 0,
  )

  /** Restart the palette cycle from here — called when a palette is chosen. */
  function anchorPalette() {
    paletteOrigin.value = time.value
  }

  onScopeDispose(pause)

  return {
    playing,
    time,
    speed,
    intensity,
    cyclePalette,
    paletteSeconds,
    palettePosition,
    rampProgress,
    anchorPalette,
    fps,
    frameMs,
    play,
    pause,
    toggle,
  }
}
