import { onScopeDispose, watch } from 'vue'
import { encodeState, readUrl } from '../core/permalink.js'

/**
 * Two-way sync between the piece on screen and the address bar.
 *
 * Discrete choices — a new seed, a different generator, a reset — push a
 * history entry, so Back walks through the pieces you looked at. Dragging a
 * slider replaces instead, so one gesture doesn't bury the history under
 * eighty entries.
 *
 * The loop guard is the comparison itself: applying state from the URL
 * regenerates the identical query string, so the write that follows is a no-op.
 */
const DEBOUNCE_MS = 200

export function usePermalink(
  { generatorId, ratioId, grain, effects, treatment, seed, params, applyState },
  { paused = null } = {},
) {
  let timer = null
  let pendingMode = 'replace'

  function write() {
    // While the opening panel is up, the URL stays bare. It has to: the panel
    // is shown precisely because the URL names no piece, so stamping the
    // piece sitting behind it would mean a reload skipped the panel and opened
    // something nobody chose.
    if (paused?.value) return

    const search = `?${encodeState({
      generatorId: generatorId.value,
      ratioId: ratioId.value,
      grain: grain.value,
      effects: effects.value,
      treatment: treatment.value,
      seed: seed.value,
      params: params.value,
    })}`
    // Writing a bare `?…` keeps the path and drops any fragment, which is how
    // an old `#…` link gets rewritten into the current form on arrival.
    if (search === window.location.search && !window.location.hash) return
    if (pendingMode === 'push') window.history.pushState(null, '', search)
    else window.history.replaceState(null, '', search)
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
    const state = readUrl()
    if (state) applyState(state)
  }

  watch([generatorId, ratioId, seed], () => schedule('push'))
  watch(params, () => schedule('replace'), { deep: true })
  watch(grain, () => schedule('replace'), { deep: true })
  watch(treatment, () => schedule('replace'), { deep: true })
  watch(effects, () => schedule('replace'), { deep: true })

  // popstate covers Back/Forward across query strings. hashchange stays for
  // the case of someone editing an old `#…` link in place.
  window.addEventListener('hashchange', readFromUrl)
  window.addEventListener('popstate', readFromUrl)

  onScopeDispose(() => {
    clearTimeout(timer)
    window.removeEventListener('hashchange', readFromUrl)
    window.removeEventListener('popstate', readFromUrl)
  })

  // Choosing from the opening panel pushes rather than replaces, so the panel
  // stays in the history and Back returns to it — the bare URL is a place, and
  // it's the one that describes the picker.
  if (paused) {
    watch(paused, (still) => {
      if (still) return
      pendingMode = 'push'
      write()
      pendingMode = 'replace'
    })
  }

  // Stamp the URL immediately so the first piece is shareable without waiting
  // for an interaction.
  write()

  return { readFromUrl }
}
