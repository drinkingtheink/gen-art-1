<script setup>
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch, watchEffect } from 'vue'
import ControlPanel from '@/components/ControlPanel.vue'
import ExportBar from '@/components/ExportBar.vue'
import EffectsBar from '@/components/EffectsBar.vue'
import PaletteBar from '@/components/PaletteBar.vue'
import ShowcaseBar from '@/components/ShowcaseBar.vue'
import SvgStage from '@/components/SvgStage.vue'
import Toolbar from '@/components/Toolbar.vue'
import { buildFilename, downloadBlob, renderToPngBlob, serializeScene } from '@/core/export.js'
import { presetFor } from '@/core/showcase.js'
import { useShowcase } from '@/composables/useShowcase.js'
import { useGenerator } from '@/composables/useGenerator.js'
import { usePermalink } from '@/composables/usePermalink.js'
import { readHash } from '@/core/permalink.js'

// A shared link is the starting state; otherwise a fresh random seed.
const piece = useGenerator(readHash() ?? {})
usePermalink(piece)

const {
  generator,
  generatorId,
  ratioId,
  canvas,
  grain,
  effects,
  defs,
  artworkFilter,
  treatment,
  basePalette,
  overlay,
  seed,
  params,
  scene,
  setParam,
  setShowcase,
  commitLive,
  selectGenerator,
  setRatio,
  setGrain,
  setEffects,
  setTreatment,
  setSeed,
  reroll,
  resetParams,
} = piece

// --- showcase -------------------------------------------------------------
const show = useShowcase()

// Motion is per-piece, and resets when the piece changes so a preset built for
// flow field never lands on subdivision.
const modulators = ref(presetFor(generator.value))
watch(generator, (g) => { modulators.value = presetFor(g) })

// Choosing a palette restarts the cycle from it, so the pick is visible
// straight away instead of waiting for the cycle to come round.
watch(() => params.value.palette, () => show.anchorPalette())

const modulatedKeys = computed(() =>
  modulators.value.map((m) => generator.value.params.find((p) => p.key === m.key)?.label ?? m.key),
)

// Push the live clock down to the scene on every change.
watchEffect(() => {
  setShowcase({
    active: show.playing.value,
    time: show.time.value,
    intensity: show.intensity.value,
    modulators: modulators.value,
    cyclePalette: show.cyclePalette.value,
    palettePosition: show.palettePosition.value,
  })
})

/**
 * Pausing keeps what's on screen: the live values are written into the params
 * before the clock stops, so the paused frame is a piece you can adjust,
 * export and link to.
 */
function toggleShowcase() {
  if (show.playing.value) {
    commitLive()
    show.pause()
  } else {
    show.play()
  }
}

function updateShowcase(patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (key in show) show[key].value = value
  }
}

// Presentation mode: the piece fills the screen with no interface, so a screen
// recording captures only the work. Escape leaves; the browser's own fullscreen
// exit is handled by the change listener.
const presenting = ref(false)

async function present() {
  try {
    await document.documentElement.requestFullscreen()
  } catch {
    // Fullscreen refused (permissions, unsupported) — still hide the UI, which
    // is the part that matters for recording.
  }
  presenting.value = true
  if (!show.playing.value) show.play()
}

function leavePresent() {
  presenting.value = false
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
}

function onFullscreenChange() {
  if (!document.fullscreenElement) presenting.value = false
}

function onKey(event) {
  if (event.key === 'Escape' && presenting.value) leavePresent()
  if (event.key === ' ' && event.target === document.body) {
    event.preventDefault()
    toggleShowcase()
  }
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  window.removeEventListener('keydown', onKey)
})

const stage = useTemplateRef('stage')
const exporting = ref(false)
const exportStatus = ref('')

/** The live <svg> inside SvgStage — what both exports serialise. */
const stageSvg = () => stage.value?.svg

async function runExport(job) {
  if (exporting.value) return
  exporting.value = true
  exportStatus.value = ''
  try {
    // Yield once so the disabled state paints before a big raster blocks us.
    await new Promise((r) => setTimeout(r, 0))
    exportStatus.value = await job()
  } catch (error) {
    exportStatus.value = `Export failed: ${error.message}`
  } finally {
    exporting.value = false
  }
}

function exportSvg() {
  return runExport(async () => {
    const svg = stageSvg()
    if (!svg) throw new Error('the stage is not ready')
    const { markup } = serializeScene(svg)
    const name = buildFilename(generatorId.value, seed.value, 'svg')
    downloadBlob(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }), name)
    return `Saved ${name} — ${(markup.length / 1024).toFixed(0)}KB of vector.`
  })
}

function exportPng(scale) {
  return runExport(async () => {
    const svg = stageSvg()
    if (!svg) throw new Error('the stage is not ready')
    const { blob, width, height, clamped } = await renderToPngBlob(svg, scale)
    const name = buildFilename(generatorId.value, seed.value, 'png')
    downloadBlob(blob, name)
    return (
      `Saved ${name} — ${width}x${height}, ${(blob.size / 1024 / 1024).toFixed(1)}MB` +
      (clamped ? ' (size clamped to what the browser can raster).' : '.')
    )
  })
}

const copied = ref(false)
let copyTimer = null

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = false }, 1600)
  } catch {
    // Clipboard blocked (insecure context, denied permission) — the URL is
    // already in the address bar, so there's nothing to recover from.
    copied.value = false
  }
}
</script>

<template>
  <div class="app" :class="{ presenting }">
    <aside class="sidebar">
      <header class="head">
        <h1 class="wordmark">gen<span>·</span>art</h1>
        <p class="blurb">{{ generator.blurb }}</p>
      </header>

      <Toolbar
        :generator-id="generatorId"
        :ratio-id="ratioId"
        :canvas="canvas"
        :seed="seed"
        @select-generator="selectGenerator"
        @set-ratio="setRatio"
        @set-seed="setSeed"
        @reroll="reroll"
        @reset="resetParams"
      />

      <button type="button" class="copy" @click="copyLink">
        {{ copied ? 'Link copied' : 'Copy link to this piece' }}
      </button>

      <ShowcaseBar
        :playing="show.playing.value"
        :speed="show.speed.value"
        :intensity="show.intensity.value"
        :cycle-palette="show.cyclePalette.value"
        :fps="show.fps.value"
        :frame-ms="show.frameMs.value"
        :modulated="modulatedKeys"
        @toggle="toggleShowcase"
        @update="updateShowcase"
        @present="present"
      />

      <hr class="rule" />

      <PaletteBar
        :palette="basePalette"
        :treatment="treatment"
        :selected="params.palette"
        @update="setTreatment"
        @select="setParam('palette', $event)"
      />

      <hr class="rule" />

      <EffectsBar
        :effects="effects"
        :grain="grain"
        @update-effects="setEffects"
        @update-grain="setGrain"
      />

      <ExportBar
        :busy="exporting"
        :status="exportStatus"
        :grain-on="grain.amount > 0"
        @export-svg="exportSvg"
        @export-png="exportPng"
      />

      <hr class="rule" />

      <ControlPanel :generator="generator" :params="params" @update="setParam" />
    </aside>

    <main class="stage-area">
      <SvgStage
        ref="stage"
        :scene="scene"
        :overlay="overlay"
        :defs="defs"
        :artwork-filter="artworkFilter"
      />

      <button v-if="presenting" type="button" class="leave" @click="leavePresent">
        Esc to exit
      </button>
    </main>
  </div>
</template>

<style scoped>
.app {
  display: grid;
  grid-template-columns: var(--sidebar) 1fr;
  height: 100%;
}

/* Presentation mode — nothing on screen but the work. */
.app.presenting {
  grid-template-columns: 1fr;
  background: #000;
  cursor: none;
}

.app.presenting .sidebar {
  display: none;
}

.app.presenting .stage-area {
  padding: 0;
}

.leave {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.leave:hover,
.leave:focus-visible {
  opacity: 1;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  padding: 1rem;
  background: var(--panel);
  border-right: 1px solid var(--panel-edge);
}

.head {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.wordmark {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wordmark span {
  color: var(--accent);
}

.blurb {
  margin: 0;
  color: var(--ink-dim);
  font-size: 0.78rem;
  line-height: 1.45;
}

.copy {
  width: 100%;
  color: var(--ink-dim);
  font-size: 0.8rem;
}

.rule {
  width: 100%;
  height: 1px;
  margin: 0;
  background: var(--panel-edge);
  border: 0;
}

.stage-area {
  display: grid;
  place-items: center;
  min-height: 0;
  min-width: 0;
  padding: 1.5rem;
}
</style>
