import { onScopeDispose, watch } from 'vue'
import { encodeState, decodeState } from '@/core/permalink.js'

/**
 * Two-way sync between the piece on screen and the address bar.
 *
 * Discrete choices — a new seed, a different generator, a reset — push a
 * history entry, so Back walks through the pieces you looked at. Dragging a
 * slider replaces instead, so one gesture doesn't bury the history under
 * eighty entries.
 *
 * The loop guard is the hash comparison itself: applying state from the URL
 * regenerates the identical hash, so the write that follows is a no-op.
 */
const DEBOUNCE_MS = 200

export function usePermalink({ generatorId, seed, params, applyState }) {
  let timer = null
  let pendingMode = 'replace'

  function write() {
    const hash = `#${encodeState({
      generatorId: generatorId.value,
      seed: seed.value,
      params: params.value,
    })}`
    if (hash === window.location.hash) return
    if (pendingMode === 'push') window.history.pushState(null, '', hash)
    else window.history.replaceState(null, '', hash)
  }

  function schedule(mode) {
    // A push anywhere in the debounce window wins: re-rolling mid-drag should
    // still leave a history entry behind.
    if (mode === 'push') pendingMode = 'push'
    clearTimeout(timer)
    timer = setTimeout(() => {
      write()
      pendingMode = 'replace'
    }, DEBOUNCE_MS)
  }

  function readFromUrl() {
    const state = decodeState(window.location.hash)
    if (state) applyState(state)
  }

  watch([generatorId, seed], () => schedule('push'))
  watch(params, () => schedule('replace'), { deep: true })

  window.addEventListener('hashchange', readFromUrl)
  window.addEventListener('popstate', readFromUrl)

  onScopeDispose(() => {
    clearTimeout(timer)
    window.removeEventListener('hashchange', readFromUrl)
    window.removeEventListener('popstate', readFromUrl)
  })

  // Stamp the URL immediately so the first piece is shareable without waiting
  // for an interaction.
  write()

  return { readFromUrl }
}
