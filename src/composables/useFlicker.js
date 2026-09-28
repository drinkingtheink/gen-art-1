import { onScopeDispose, ref, watch } from 'vue'

/**
 * A clock for effects that must keep moving whether or not showcase is playing.
 *
 * Static bursts were originally driven by the showcase clock, which meant they
 * only ever fired during playback — sitting looking at a piece, the static was
 * simply on the whole time, which is the opposite of interference. Interference
 * has to interrupt on its own schedule.
 *
 * It runs only while something needs it, so a piece with no static costs
 * nothing, and it stops when the tab is hidden because requestAnimationFrame
 * does.
 */
export function useFlicker(isActive) {
  const time = ref(0)

  let raf = null
  let startedAt = 0

  function tick(now) {
    time.value = (now - startedAt) / 1000
    raf = requestAnimationFrame(tick)
  }

  function start() {
    if (raf) return
    startedAt = performance.now() - time.value * 1000
    raf = requestAnimationFrame(tick)
  }

  function stop() {
    if (!raf) return
    cancelAnimationFrame(raf)
    raf = null
  }

  watch(isActive, (active) => (active ? start() : stop()), { immediate: true })
  onScopeDispose(stop)

  return time
}
