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

  // Frame rate is the number that decides whether a recording will look good,
  // and it can't be known ahead of time — it depends on the piece, the
  // settings and the machine. So the app measures and reports it.
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

  function reset() {
    time.value = 0
    samples.value = []
  }

  /** Where the palette cycle sits right now, in whole-palette units. */
  const palettePosition = computed(() =>
    cyclePalette.value && paletteSeconds.value > 0 ? time.value / paletteSeconds.value : 0,
  )

  onScopeDispose(pause)

  return {
    playing,
    time,
    speed,
    intensity,
    cyclePalette,
    paletteSeconds,
    palettePosition,
    fps,
    frameMs,
    play,
    pause,
    toggle,
    reset,
  }
}
