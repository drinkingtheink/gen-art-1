import { onScopeDispose, shallowRef, watch } from 'vue'
import { mixPalettes } from '@/core/palettes.js'

/**
 * Eases between palettes instead of cutting.
 *
 * Works on the palette *data* rather than cross-fading the rendered scene:
 * generators are pure and take a resolved palette, so interpolating it means
 * the geometry is byte-identical throughout and only the colour moves. No
 * second scene, no flicker risk.
 *
 * `key` should change only on a deliberate switch — picking a palette, or
 * changing piece. The showcase cycle moves `source` continuously and must not
 * retrigger a fade on every frame.
 */
const DEFAULT_MS = 700

/** Smoothstep. A linear cross-fade reads as a wipe; easing the ends reads as a dissolve. */
const ease = (t) => t * t * (3 - 2 * t)

export function usePaletteFade(source, key, durationMs = DEFAULT_MS) {
  const displayed = shallowRef(source.value)

  let from = null
  let startedAt = 0
  let raf = null
  let safety = null

  function stop() {
    if (raf) cancelAnimationFrame(raf)
    if (safety) clearTimeout(safety)
    raf = null
    safety = null
  }

  function settle() {
    stop()
    from = null
    displayed.value = source.value
  }

  function frame() {
    const t = durationMs > 0 ? Math.min(1, (performance.now() - startedAt) / durationMs) : 1
    if (t >= 1 || !from) {
      settle()
      return
    }
    // Chases the live source, so a fade started mid-cycle still lands on
    // wherever the cycle has moved to rather than a stale target.
    displayed.value = mixPalettes(from, source.value, ease(t))
    raf = requestAnimationFrame(frame)
  }

  watch(key, () => {
    from = displayed.value
    startedAt = performance.now()
    stop()
    raf = requestAnimationFrame(frame)
    // rAF never fires in a background tab, which would strand the fade
    // half-finished. Land it regardless.
    safety = setTimeout(settle, durationMs + 250)
  })

  // While no fade is running, follow the source exactly — this is what carries
  // the showcase cycle through.
  watch(source, (value) => {
    if (!raf) displayed.value = value
  })

  onScopeDispose(stop)

  return displayed
}
