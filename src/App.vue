<script setup>
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch, watchEffect } from 'vue'
import ControlPanel from '@/components/ControlPanel.vue'
import ExportBar from '@/components/ExportBar.vue'
import GenArtMark from '@/components/GenArtMark.vue'
import LaunchPanel from '@/components/LaunchPanel.vue'
import EffectsBar from '@/components/EffectsBar.vue'
import PaletteBar from '@/components/PaletteBar.vue'
import ShowcaseBar from '@/components/ShowcaseBar.vue'
import SvgStage from '@/components/SvgStage.vue'
import Toolbar from '@/components/Toolbar.vue'
import { buildFilename, downloadBlob, renderToPngBlob, serializeScene } from '@/core/export.js'
import { adviceFor, buildCssRule, byteLength, formatBytes, toDataUri } from '@/core/css.js'
import { randomState } from '@/core/random.js'
import { presetFor } from '@/core/showcase.js'
import { useShowcase } from '@/composables/useShowcase.js'
import { useGenerator } from '@/composables/useGenerator.js'
import { usePermalink } from '@/composables/usePermalink.js'
import { readUrl } from '@/core/permalink.js'

// A shared link is the starting state; otherwise a fresh random seed.
const opened = readUrl()
const piece = useGenerator(opened ?? {})

/**
 * A visit that names no piece opens on the picker instead of dropping straight
 * into whichever piece happens to be first, as though it were the only one.
 * The URL says
 * which piece, so the URL is also what says whether there's a choice to make —
 * including on Back, which is how the picker is reachable again.
 *
 * The test is `g`, not "any query at all": a link arriving with a tracking
 * parameter stuck on the end still names no piece.
 */
const launching = ref(!opened?.generatorId)

usePermalink(piece, { paused: launching })

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
  regen,
  resetParams,
  applyState,
} = piece

// --- showcase -------------------------------------------------------------
const show = useShowcase()

/**
 * Someone who has just chosen a piece off the panel wants to see what it does,
 * and most of these were built to move — so leaving the panel starts the clock.
 * The ease-in means it reads as the piece waking up rather than as a cut.
 *
 * A link that names a piece is the exception, and it's why this lives here
 * rather than in useShowcase. Pausing commits the live frame into the params
 * precisely so a moment can be copied and sent; autoplaying that link would
 * show the recipient the sender's moment for a second and then drift off it.
 */
const stillness = window.matchMedia?.('(prefers-reduced-motion: reduce)')

function leaveLaunch() {
  launching.value = false
  if (!stillness?.matches) show.play()
}

/**
 * Back to the picker, deliberately rather than by luck.
 *
 * Until now the only way was the browser's Back button, which worked only if
 * the picker happened to be behind you in the history — so anyone arriving on
 * a shared link had no way back to it at all, the URL naming a piece from the
 * first moment.
 *
 * The bare URL is pushed rather than just flipping the flag, because in this
 * app the URL is what decides whether the picker is up: leaving it naming a
 * piece would mean a reload skipped the panel, and Back would step past the
 * picker instead of to it.
 */
function showLaunch() {
  if (launching.value) return
  cancelOpeningPlay()
  // The panel covers the stage, so there is nothing to animate behind it.
  show.pause()
  launching.value = true
  window.history.pushState(null, '', window.location.pathname)
}

/**
 * A shared link starts moving too, but only after a beat.
 *
 * The frame in a permalink was chosen — pausing writes the live values into
 * the params precisely so a moment can be sent — so the piece holds on it long
 * enough to read as a composition before the ease begins. Nothing of what was
 * sent is skipped: the ramp starts from those exact params, so the first thing
 * on screen is the sender's frame and the motion grows out of it.
 *
 * Reloading the link always brings that frame back, because playback never
 * writes to the address bar. Only pausing does.
 */
const SHARED_HOLD_MS = 2200
let openingPlay = null

/** Touching playback yourself beats the pending start, in either direction. */
function cancelOpeningPlay() {
  clearTimeout(openingPlay)
  openingPlay = null
}

/** Open a specific piece — a card on the panel, or the randomiser's roll. */
function startWith(state) {
  applyState(state)
  leaveLaunch()
}

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
    ramp: show.rampProgress.value,
  })
})

/**
 * Pausing keeps what's on screen: the live values are written into the params
 * before the clock stops, so the paused frame is a piece you can adjust,
 * export and link to.
 */
function toggleShowcase() {
  cancelOpeningPlay()
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
  cancelOpeningPlay()
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
  // The panel owns the keyboard while it's up, Escape included.
  if (launching.value) return
  if (event.key === 'Escape' && presenting.value) leavePresent()
  if (event.key === ' ' && event.target === document.body) {
    event.preventDefault()
    toggleShowcase()
  }
}

/**
 * Back out of a piece to the bare URL and the picker returns, because that is
 * the state the URL describes. usePermalink's own popstate listener restores
 * the piece when there is one; this decides whether the panel is over it.
 */
function onPopState() {
  launching.value = !readUrl()?.generatorId
  // The panel covers the stage, so there's nothing to animate behind it.
  if (launching.value) show.pause()
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  window.addEventListener('keydown', onKey)
  window.addEventListener('popstate', onPopState)

  // Arrived straight on a piece, which means a link named it.
  if (!launching.value && !stillness?.matches) {
    openingPlay = setTimeout(() => {
      openingPlay = null
      show.play()
    }, SHARED_HOLD_MS)
  }
})
onUnmounted(() => {
  cancelOpeningPlay()
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('popstate', onPopState)
})

const stage = useTemplateRef('stage')
const exporting = ref(false)
const exportStatus = ref('')

/** The live <svg> inside SvgStage — what both exports serialise. */
const stageSvg = () => stage.value?.svg

/**
 * Every export stops the clock first.
 *
 * Exporting mid-playback serialises whatever instant the click landed on, and
 * that frame exists nowhere but the file: playback never writes to the address
 * bar, so the piece you saved could not be reproduced from its own permalink,
 * re-exported at another size, or adjusted. It would be the one artefact here
 * that is not a piece.
 *
 * Pausing is exactly the fix, because pausing writes the live values into the
 * params — so this doesn't take the frame away, it makes it the piece. The
 * file, the sliders, the address bar and the canvas all agree afterwards.
 *
 * It pauses rather than refusing. A disabled export button during playback
 * states the rule correctly and leaves you to work it out; this keeps the
 * frame you were looking at, which is what you were asking for by clicking.
 */
async function runExport(job) {
  if (exporting.value) return
  exporting.value = true
  exportStatus.value = ''

  const wasPlaying = show.playing.value
  if (wasPlaying) {
    commitLive()
    show.pause()
  }

  try {
    // Yield once so the disabled state paints before a big raster blocks us.
    // It also lands after Vue's flush, so the stage being serialised is the
    // one the committed params just rendered.
    await new Promise((r) => setTimeout(r, 0))
    const said = await job()
    exportStatus.value = wasPlaying
      ? `Paused on this frame, so it stays reproducible.${said ? ` ${said}` : ''}`
      : said
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

/**
 * The piece as a CSS rule, on the clipboard.
 *
 * Source is the live stage, same as the SVG export, so what you paste is what
 * is on screen — grain and effects included. They survive because a data URI
 * is rendered by the browser's own SVG engine, filters and all; the server-side
 * link preview drops them only because resvg's filter support is partial.
 */
/**
 * The piece as a CSS rule, shown rather than sent.
 *
 * Source is the live stage, same as the SVG export, so what you copy is what is
 * on screen — grain and effects included. They survive because a data URI is
 * rendered by the browser's own SVG engine, filters and all; the server-side
 * link preview drops them only because resvg's filter support is partial.
 *
 * Nothing is written to disk and nothing is pushed to the clipboard unasked.
 * The rule goes into a panel, where it can be read, selected and copied by
 * hand — which also means it still works where the clipboard API is refused.
 */
const cssText = ref('')
const cssNote = ref('')

function buildCss() {
  return runExport(async () => {
    const svg = stageSvg()
    if (!svg) throw new Error('the stage is not ready')

    const rule = buildCssRule({
      image: toDataUri(serializeScene(svg).markup),
      background: scene.value.background,
    })
    const size = byteLength(rule)
    cssText.value = rule
    cssNote.value = [formatBytes(size), adviceFor(size)].filter(Boolean).join(' · ')
    // The panel says the size; a second line under it would only repeat itself.
    return ''
  })
}

function closeCss() {
  cssText.value = ''
  cssNote.value = ''
}

/**
 * A rule describes one piece, so it retires when the piece changes.
 *
 * Watching `scene` looked right and was wrong: it is recomputed every frame of
 * showcase playback, so the panel shut the instant it opened on anything
 * moving. These are the things that actually define the piece — the same set
 * the permalink watches — and none of them move while the clock runs, because
 * playback drives the lived params and only pausing writes them back.
 */
watch(
  [generatorId, ratioId, seed, params, grain, effects, treatment],
  () => {
    if (cssText.value) closeCss()
  },
  { deep: true },
)

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
  <LaunchPanel
    v-if="launching"
    @pick="startWith"
    @randomize="startWith(randomState())"
    @dismiss="leaveLaunch"
  />

  <div class="app" :class="{ presenting }">
    <aside class="sidebar">
      <header class="head">
        <h1 class="wordmark">
          <button type="button" class="home" title="Back to all pieces" @click="showLaunch">
            <GenArtMark />gen<span>·</span>Art
          </button>
        </h1>
        <p class="tagline">
          <span>Every Pause a Masterpiece</span>
          <button type="button" class="all" @click="showLaunch">All pieces</button>
        </p>
      </header>

      <Toolbar
        :generator-id="generatorId"
        :blurb="generator.blurb"
        :ratio-id="ratioId"
        :canvas="canvas"
        :seed="seed"
        @select-generator="selectGenerator"
        @set-ratio="setRatio"
        @set-seed="setSeed"
        @regen="regen"
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
        :canvas="canvas"
        :css="cssText"
        :css-note="cssNote"
        @export-svg="exportSvg"
        @export-png="exportPng"
        @export-css="buildCss"
        @close-css="closeCss"
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
  margin: 0 0 0 10px;
  /* The mark is sized to cap height, so the two stand level whatever this is
     set to and the pair scale together from this one number. A modest step up
     from the 1.05rem it was — enough that the name carries the header, short
     of the 1.9rem needed to hold the mark at its old size, which made a
     sidebar header look like a hero. */
  font-size: 1.8rem;
  /* 700 rather than 600: tracking this wide thins a wordmark out, and Space
     Grotesk's flat sides carry the extra weight without closing up. */
  font-family: var(--wordmark);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/**
 * The name is the way back to the picker — the oldest convention on the web,
 * and it costs no room in a 288px column. The explicit button below it is for
 * anyone who does not think to try.
 */
.home {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  /* Everything the global button style would impose, undone: this has to read
     as the wordmark, not as a control. */
  padding: 0;
  color: inherit;
  background: none;
  border: 0;
  border-radius: 0;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
}

.home:hover {
  background: none;
  opacity: 0.82;
}

.wordmark span {
  color: var(--accent);
  /* The separator is its own flex item, so the row's gap lands on both sides
     of it and reads as a gap around a word rather than a mark between two.
     Pulled back in em, for the same reason the mark's margins are. */
  margin: -0.2em;
}

/**
 * Sentence case under an uppercase wordmark, which is the contrast that makes
 * it read as a strapline rather than as a second heading. It is also the
 * truest thing the app does: pausing writes the live frame into the params, so
 * whatever is on screen at that instant becomes a piece you can adjust, export
 * and link to.
 */
.tagline {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  /* Wraps rather than crushing the strapline if the column is ever narrower. */
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  /* The loudest line in the sidebar after the name itself, and loud without
     reaching for the accent — that belongs to the mark, the separator and the
     controls, and a fourth teal thing makes all four quieter. The presence
     comes from brightness instead: full-strength ink against the dim grey
     everything else in this column is set in, in the wordmark's own face, a
     size above the copy. */
  color: var(--ink);
  font-family: var(--wordmark);
  font-size: 1.05rem;
  font-weight: 500;
  letter-spacing: 0.005em;
  line-height: 1.35;
}

.copy {
  width: 100%;
  color: var(--ink-dim);
  font-size: 0.8rem;
}

/* Low-key on purpose: it has to be findable without competing with the name
   above it or the piece picker below. */
.all {
  flex: none;
  padding: 0.1rem 0.4rem;
  color: var(--ink-dim);
  background: none;
  border-color: transparent;
  font-family: inherit;
  font-size: 0.72rem;
  white-space: nowrap;
}

.all:hover {
  color: var(--accent);
  background: none;
  border-color: var(--panel-edge);
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
