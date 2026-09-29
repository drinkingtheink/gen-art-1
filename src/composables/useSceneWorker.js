import { onScopeDispose, ref } from 'vue'

/**
 * A single worker that renders whichever scene was asked for most recently.
 *
 * Requests are coalesced rather than queued. While a piece is being generated
 * the slider keeps moving, and every intermediate position it passed through
 * is already stale by the time the worker frees up — so only the latest is
 * kept and the rest are dropped. That is what the old 140ms throttle was
 * approximating, except the throttle guessed at the duration and this waits
 * for the actual one.
 *
 * Replies carry the token they were asked with, so a late reply from a
 * superseded request is discarded instead of painting over a newer frame.
 */
export function useSceneWorker() {
  const available = ref(true)

  let worker = null
  let busy = false
  let pending = null
  let token = 0
  let onScene = null

  /**
   * Built on first use rather than at startup: the worker bundle pulls in
   * every generator, and most sessions never open a heavy one.
   */
  function ensure() {
    if (worker || !available.value) return worker
    try {
      worker = new Worker(new URL('../workers/scene.worker.js', import.meta.url), {
        type: 'module',
      })
      worker.onmessage = ({ data }) => {
        busy = false
        if (data.token === token && !data.error && onScene) onScene(data.scene)
        flush()
      }
      worker.onerror = () => {
        // Losing the worker is not fatal — the caller generates inline.
        available.value = false
        worker?.terminate()
        worker = null
        busy = false
        const queued = pending
        pending = null
        if (queued) queued.fallback()
      }
    } catch {
      available.value = false
    }
    return worker
  }

  function flush() {
    if (busy || !pending || !worker) return
    const next = pending
    pending = null
    busy = true
    token += 1
    worker.postMessage({ ...next.spec, token })
  }

  /**
   * `spec` must be plain data. It is spread into fresh objects before being
   * posted because the values come from Vue refs, and a reactive proxy is not
   * something the structured clone algorithm should be asked to reason about.
   */
  function request(spec, handler, fallback) {
    if (!ensure()) {
      fallback()
      return
    }
    onScene = handler
    pending = { spec, fallback }
    flush()
  }

  onScopeDispose(() => {
    worker?.terminate()
    worker = null
  })

  return { available, request }
}
