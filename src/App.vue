<script setup>
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch, watchEffect } from 'vue'
import ControlPanel from '@/components/ControlPanel.vue'
import ExportBar from '@/components/ExportBar.vue'
import GenArtMark from '@/components/GenArtMark.vue'
import ButtonIcon from '@/components/ButtonIcon.vue'
import AboutPanel from '@/components/AboutPanel.vue'
import GalleryPanel from '@/components/GalleryPanel.vue'
import LaunchPanel from '@/components/LaunchPanel.vue'
import EffectsBar from '@/components/EffectsBar.vue'
import PaletteBar from '@/components/PaletteBar.vue'
import ShowcaseBar from '@/components/ShowcaseBar.vue'
import SvgStage from '@/components/SvgStage.vue'
import Toolbar from '@/components/Toolbar.vue'
import {
  buildFilename,
  canShareImageFile,
  downloadBlob,
  phoneCanvas,
  renderToPngBlob,
  renderToWallpaperBlob,
  serializeScene,
  shareImageBlob,
} from '@/core/export.js'
import { adviceFor, buildCssRule, byteLength, formatBytes, toDataUri } from '@/core/css.js'
import { getPalette } from '@/core/palettes.js'
import { randomState } from '@/core/random.js'
import { presetFor } from '@/core/showcase.js'
import { useShowcase } from '@/composables/useShowcase.js'
import { useGenerator } from '@/composables/useGenerator.js'
import { usePermalink } from '@/composables/usePermalink.js'
import { readUrl } from '@/core/permalink.js'
import { DEFAULT_FRAME, coerceFrame } from '@/core/mounts.js'

/**
 * Narrow enough that the sidebar is gone — the same 700px the stylesheet at
 * the bottom of this file uses, which is the one number that has to stay in
 * step by hand.
 *
 * Watched rather than read once: a phone turned on its side crosses this, and
 * so does a dragged window.
 *
 * Declared up here, above the first piece, because the shape the app reaches
 * for when nothing names one depends on it.
 */
const NARROW = window.matchMedia?.('(max-width: 700px)')
const narrow = ref(NARROW?.matches ?? false)
NARROW?.addEventListener('change', (event) => (narrow.value = event.matches))

/**
 * The shape the app picks when it is choosing for itself.
 *
 * A phone is a column, and a 3:2 in a column is a letterbox with the whole
 * screen's width wasted above and below it. 2:3 rather than 1:√2 because a
 * phone viewport is nearer 1:2 than either, and the taller of the two wastes
 * less.
 *
 * It applies only where nothing else has an opinion: the first piece of a bare
 * visit, the cards in the picker, and a roll. A link that names a shape is
 * obeyed, on any screen — the permalink is the piece, and a phone reshaping
 * someone's composition on arrival would be the same bug as rerolling it.
 */
const ownShape = computed(() => (narrow.value ? 'portrait' : 'square'))

// A shared link is the starting state; otherwise a fresh random seed.
const opened = readUrl()

/**
 * `#about` is how the two legal documents get back here. They are their own
 * pages, so leaving one is a real navigation, and the fragment is what asks
 * for the panel on arrival.
 *
 * It says nothing about the picker, which is what makes the return land where
 * the visit started — over the piece if the link named one, over the picker if
 * it did not, because About paints above both.
 *
 * A fragment rather than a query field, because the query string is the piece
 * and a view flag there would ride along in every link that carried it.
 *
 * Read here, at the top, and not where the panel's state is declared: the
 * first thing `usePermalink` does is stamp the address, and that write drops
 * the fragment. Everything below this line is already too late to see it.
 */
const ARRIVED_AT_ABOUT = window.location.hash === '#about'
const piece = useGenerator(opened ?? { ratioId: NARROW?.matches ? 'portrait' : undefined })

/**
 * A visit that names no piece opens on the picker instead of dropping straight
 * into whichever piece happens to be first, as though it were the only one.
 * The URL says
 * which piece, so the URL is also what says whether there's a choice to make —
 * including on Back, which is how the picker is reachable again.
 *
 * The test is `g`, not "any query at all": a link arriving with a tracking
 * parameter stuck on the end still names no piece.
 *
 */
const launching = ref(!opened?.generatorId)

/**
 * On the wall, as a place in the URL rather than a flag in memory.
 *
 * `null` is the studio; a frame id is the gallery, hung in that frame. It has
 * to live here rather than inside the panel, because in this app the URL is
 * what decides which surface is up — the picker already works this way — and
 * a gallery that existed only as component state could not be sent to anyone.
 *
 * A link's `w` is honoured only when the link also names a piece. `?w=mat` on
 * its own would otherwise open an empty frame over the picker.
 */
const wall = ref(
  opened?.generatorId && opened.wall !== undefined ? coerceFrame(opened.wall) : null,
)

/**
 * Loading a link restores the view it was shared from, not only the piece.
 *
 * This wraps the generator's own applyState because `w` is the one field that
 * isn't part of the piece, and useGenerator has no business knowing a gallery
 * exists. It is also what makes Back and Forward walk in and out of the
 * gallery: popstate comes through here.
 */
function applyShared(state) {
  piece.applyState(state)
  wall.value = state.wall === undefined ? null : coerceFrame(state.wall)
}

const { href: shareHref } = usePermalink(
  { ...piece, wall, applyState: applyShared },
  { paused: launching },
)

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
  selectPalette,
  nextPalette,
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

/**
 * A rolled piece, upright on a narrow screen and drawn to its edges.
 *
 * The shape is overridden *after* the roll rather than in place of it, which
 * matters more than it looks: `randomState` draws the generator, then the
 * shape, then every param from one seeded sequence. Skip the shape draw and
 * the sequence shifts, so the same seed would make different art on a phone
 * than on a desktop — and the whole premise is that a seed reproduces a piece
 * anywhere. Drawing it and discarding it keeps them identical. The margin is
 * overridden the same way and for the same reason.
 *
 * The margin goes to zero because on a phone it is subtracted twice. The piece
 * is already inset by the stage's own padding and sitting in the one column
 * there is, so a generator's 60 units of its own paper is a border inside a
 * border — and what it borders is the smallest the artwork is ever displayed.
 * On a desktop that margin is composition; here it is the difference between
 * a piece and a stamp. It is also what the wallpaper is cropped from, and a
 * background with a band of empty paper down two sides is not a background.
 *
 * Every generator carries `margin` with a floor of 0, so this is in range
 * wherever it lands. Guarded on the key anyway, so a generator that one day
 * composes without one is unaffected rather than given a param it never
 * declared.
 */
function rollPiece() {
  const rolled = randomState()
  if (!narrow.value) return rolled

  return {
    ...rolled,
    ratioId: ownShape.value,
    params: 'margin' in rolled.params ? { ...rolled.params, margin: 0 } : rolled.params,
  }
}

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
  // Two surfaces cannot both be up. The picker is about to cover everything,
  // and leaving the wall set would mean Back landed on a gallery for a piece
  // the picker had already moved on from.
  wall.value = null
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
  // Whichever panel is up owns the keyboard, Escape included.
  if (launching.value || previewing.value || about.value) return
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
  window.addEventListener('hashchange', takeAboutHash)

  // The fragment this visit arrived on, cleared now the panel it asked for is
  // up. While the picker is holding the address bare, usePermalink never
  // writes, so nothing else would take it off.
  takeAboutHash()

  /**
   * Arrived straight on a piece, which means a link named it — and the clock
   * starts, unless the link arrived on the wall.
   *
   * A wall link is a link to a composition. Opening the gallery from inside
   * the studio already pauses playback, for the reason written there: a mount
   * of a frame that existed for one sixtieth of a second is not a
   * presentation of anything. A link that opens the gallery has to do the
   * same, and it is worse if it doesn't — the framed image is composed once,
   * so it holds the sender's frame, while the piece behind the panel drifts
   * out from under it. Leaving for the studio then lands on a piece nobody
   * sent, and copying the link from there passes the drift on.
   */
  if (!launching.value && wall.value === null && !stillness?.matches) {
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
  window.removeEventListener('hashchange', takeAboutHash)
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
 * The screen's own pixels, settled once.
 *
 * Read at startup rather than per click: `screen` and the pixel ratio do not
 * change under a phone, and the number is on screen before the button is
 * pressed — recomputing it would only risk the label and the file disagreeing.
 */
const phonePixels = phoneCanvas()

/**
 * Whether a saved background can reach the photo library.
 *
 * Settled once like the screen size, because it is a property of the browser
 * and not of the piece. It decides which of two presses the button is on.
 */
const canShareFile = canShareImageFile()

/**
 * A rendered background, waiting for the press that files it away.
 *
 * Only ever set where the share sheet is available, because that is the only
 * flow needing two presses. Safari will not open a sheet after an await and a
 * screen-sized raster is an await, so the first press does the part that has
 * to happen while the frame is still on screen — pause, commit, render — and
 * the second press, a fresh gesture, hands over what the first one made.
 *
 * Where there is no sheet there is nothing to wait for: one press renders and
 * downloads, exactly as before.
 */
const phoneReady = ref(null)

/**
 * A rendered background belongs to the frame it came off.
 *
 * The permalink is the piece, so a change to it means what is in hand is no
 * longer what is on screen — and a background saved from a stale render would
 * be a file that the link it claims to come from cannot reproduce.
 */
watch(shareHref, () => {
  if (!phoneReady.value) return
  phoneReady.value = null
  exportStatus.value = ''
})

/**
 * The piece as this phone's background.
 *
 * The one export that belongs on a phone. Everything else in the export bar
 * asks you to choose a size and tells you what it is in inches at 300dpi,
 * which is a print decision made at a desk; this asks nothing, because the
 * device already knows the only answer there is — its own screen.
 *
 * It goes through `runExport` like the rest, so playback pauses first and the
 * frame you saved is a piece you could get back from the permalink.
 */
function exportWallpaper() {
  return runExport(async () => {
    const svg = stageSvg()
    if (!svg) throw new Error('the stage is not ready')
    const { blob, width, height, extension } = await renderToWallpaperBlob(svg, phonePixels)
    const name = buildFilename(generatorId.value, seed.value, extension, 'phone')

    if (canShareFile) {
      phoneReady.value = { blob, name }
      return `Rendered at ${width}×${height} — now save it to your photos.`
    }

    downloadBlob(blob, name)
    return `Saved to your downloads — ${width}×${height}.`
  })
}

/**
 * The second press: the rendered background into the photo library.
 *
 * Deliberately not inside `runExport`. That helper yields a frame and awaits a
 * raster, and both spend the user activation Safari wants before it will open
 * a share sheet; here the file is built and handed over with nothing awaited
 * in front of it.
 *
 * Backing out of the sheet arrives as `AbortError`. That is a decision rather
 * than a failure, so it keeps the render in hand and the button on screen to
 * be pressed again.
 *
 * Anything else falls back to the download. `canShare` is asked twice — once
 * about files at all, and again about this actual file — and the second answer
 * can be no where the first was yes, on a size limit the platform never
 * published. The file is already rendered by then, so the worst available
 * answer is still better than dropping it: Files is an awkward place to set a
 * wallpaper from, but it is a place.
 */
async function sharePhoneBackground() {
  const ready = phoneReady.value
  if (!ready) return

  try {
    const sending = shareImageBlob(ready.blob, ready.name)
    exportStatus.value = 'Choose Save Image to put it in your photos.'
    await sending
    phoneReady.value = null
  } catch (error) {
    if (error.name === 'AbortError') {
      exportStatus.value = ''
      return
    }

    downloadBlob(ready.blob, ready.name)
    phoneReady.value = null
    exportStatus.value = 'Your photos turned it down, so it went to your downloads instead.'
  }
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

/**
 * The preview gallery.
 *
 * Only a flag: the panel composes its own documents from the scene it is
 * handed and never touches the stage, so there is nothing here to keep in
 * step. Playback stops on the way in for the same reason exporting does it —
 * a mount of a frame that existed for one sixtieth of a second is not a
 * presentation of anything.
 */
const previewing = computed(() => wall.value !== null)

/**
 * Local state, not URL state.
 *
 * The wall is in the link because which room a piece hangs in is part of what
 * you would send someone. Having read the about page is not — a link that
 * opened on it would be a link about the app rather than about a piece.
 */
const about = ref(ARRIVED_AT_ABOUT)

/**
 * The fragment, consumed rather than left lying in the address bar.
 *
 * Bound to `hashchange` as well, because a link to `/#about` from a page the
 * browser already has open changes only the fragment: there is no reload, so
 * `ARRIVED_AT_ABOUT` never sees it and only this does.
 *
 * Cleared with replaceState rather than by assigning `location.hash`, which
 * would leave a bare `#` behind and push a history entry nobody asked for.
 * `usePermalink` strips it too, but only once it writes — and while the picker
 * is up it deliberately does not write at all, so this is what keeps the
 * address ordinary in that case.
 */
function takeAboutHash() {
  if (window.location.hash !== '#about') return
  about.value = true
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}

function openPreview() {
  if (show.playing.value) {
    commitLive()
    show.pause()
  }
  wall.value = DEFAULT_FRAME
}

/**
 * A whole new piece, from the tray rather than from the opening panel.
 *
 * The same roll the panel's dice makes — `rollPiece()` — so the two agree
 * about what "random" means here: a generator, a shape, a seed and every
 * param, with grain and effects left on their defaults, because a random pile
 * of bloom and scanlines reads as a broken render rather than as a choice.
 *
 * Re-gen sits beside this and is the smaller version of it: a new seed for
 * the piece you already have. This replaces the piece.
 */
function randomize() {
  applyState(rollPiece())
}

/**
 * Not every generator takes a palette — the ones that draw their own colour
 * don't — and a button that steps through sets the piece ignores is worse than
 * no button. Asked of the generator rather than of the params, because that is
 * where the answer is authored.
 */
const hasPalette = computed(() =>
  generator.value.params.some((spec) => spec.type === 'palette'),
)

/**
 * The palette the caption names — the chosen one, not the lived one.
 *
 * `basePalette` is what the piece is wearing this instant, and with Cycle
 * palette running that is a different set every frame: the caption churned
 * through a hundred names a minute and read as a fault. This is the set the
 * piece is anchored to and the one the permalink carries, so it holds still
 * while the colour drifts and moves only when Palette is pressed — which is
 * the one time a caption changing is information rather than noise.
 */
const chosenPalette = computed(() => getPalette(params.value.palette))

const copied = ref(false)
let copyTimer = null

/**
 * One clipboard path for both buttons — the sidebar's and the gallery's.
 *
 * The link comes from `shareHref()` rather than `window.location.href`,
 * because URL writes are debounced: opening the gallery and copying straight
 * away read the address bar before `&w=` had landed, and sent a link back to
 * the studio.
 */
async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareHref())
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
  <Transition name="gallery">
    <GalleryPanel
      v-if="previewing"
      :scene="scene"
      :defs="defs"
      :artwork-filter="artworkFilter"
      :overlay="overlay"
      :title="`${generator.name} · ${seed}`"
      :frame="wall ?? DEFAULT_FRAME"
      :copied="copied"
      @frame="wall = $event"
      @copy="copyLink"
      @dismiss="wall = null"
    />
  </Transition>

  <Transition name="about">
    <AboutPanel v-if="about" :return-to="launching ? '' : shareHref()" @dismiss="about = false" />
  </Transition>

  <LaunchPanel
    v-if="launching"
    :shape="ownShape"
    @pick="startWith"
    @randomize="startWith(rollPiece())"
    @about="about = true"
    @dismiss="leaveLaunch"
  />

  <div class="app" :class="{ presenting }">
    <!-- The sidebar's header, for the widths that have no sidebar. Exactly one
         of the two is ever displayed, so the wordmark is never on screen twice
         and only one of them is in the accessibility tree. -->
    <header class="pocket">
      <h1 class="wordmark">
        <button type="button" class="home" title="Back to all pieces" @click="showLaunch">
          <GenArtMark />gen<span>·</span>Art
        </button>
      </h1>
      <span class="ways-out">
        <button type="button" class="all" @click="showLaunch">All pieces</button>
        <button type="button" class="all" @click="about = true">About</button>
      </span>
      <p class="note">
        Explore the Gallery. To fine-tune, add effects, play with color, and
        export print-size files, visit on desktop.
      </p>

      <!-- The one thing a phone can do better than a desktop, so it is asked
           here and nowhere else: the device knows its own screen, and the file
           it gets is cut to those exact pixels rather than to a paper size. -->
      <div class="keep">
        <!-- Two presses where a share sheet exists, because the sheet cannot be
             opened after the render it is given. The second button says what
             the press does rather than what the file is, since by then the file
             is already made. -->
        <button
          v-if="phoneReady"
          type="button"
          class="keepsake"
          @click="sharePhoneBackground"
        >
          <ButtonIcon glyph="download" />
          Save to your photos
        </button>
        <button
          v-else
          type="button"
          class="keepsake"
          :disabled="exporting"
          @click="exportWallpaper"
        >
          <ButtonIcon glyph="download" />
          {{ exporting ? 'Saving…' : 'Save as phone background' }}
        </button>
        <p class="said">
          {{ exportStatus || `Fits this screen — ${phonePixels.width}×${phonePixels.height}px.` }}
        </p>
      </div>
    </header>

    <aside class="sidebar">
      <header class="head">
        <!-- Up on the name's line rather than under the strapline. These are
             the two ways out of the studio, and as words they were competing
             with the strapline for the same row; as marks they sit in the space
             the wordmark was already leaving empty.

             Labelled, because an icon on its own is a guess. Both carry the
             words for a screen reader and for a hover. -->
        <div class="top">
          <h1 class="wordmark">
            <button type="button" class="home" title="Back to all pieces" @click="showLaunch">
              <GenArtMark />gen<span>·</span>Art
            </button>
          </h1>
          <span class="ways-out">
            <button
              type="button"
              class="way"
              title="All pieces"
              aria-label="All pieces"
              @click="showLaunch"
            >
              <ButtonIcon glyph="grid" />
            </button>
            <button
              type="button"
              class="way"
              title="About"
              aria-label="About"
              @click="about = true"
            >
              <ButtonIcon glyph="info" />
            </button>
          </span>
        </div>
        <p class="tagline"><span>Every Pause a Masterpiece</span></p>
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
        <ButtonIcon :glyph="copied ? 'tick' : 'link'" />
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
        @select="selectPalette"
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

      <!-- Under the work rather than in the sidebar: these are the things you
           do *to the piece in front of you*, so they are asked where the piece
           is. Everything else stays in the panel, which is where you go
           to change what the piece is. -->
      <div v-if="!presenting" class="stage-controls">
        <!-- Phones only: the label off a gallery wall.
             
             A desktop says what you are looking at four times over in the
             sidebar — piece, shape, seed, palette. A phone said it nowhere, so
             the one screen that is purely for looking was the one that never
             named the thing. It is also what makes the two buttons beside it
             legible without words: the seed changes under Re-gen and the
             palette name under Palette, so the icons are captioned by their
             own effect. -->
        <div class="plate-line">
          <p class="ident">
            {{ generator.name
            }}<template v-if="hasPalette"><span class="dot">·</span>{{
              chosenPalette.name }}</template
            ><span class="dot">·</span><span class="which">{{ seed }}</span>
          </p>

          <!-- Random lives up here, on the line that names the piece, because
               that is the line it acts on — it replaces what the caption says.
               And it is a plain text button where everything below is a filled
               chip, which is the whole of the grouping: a different kind of
               thing, drawn as a different kind of control, at full strength. -->
          <button
            type="button"
            class="elsewhere"
            title="A different piece entirely"
            @click="randomize"
          >
            <ButtonIcon glyph="dice" />
            Random
          </button>
        </div>

        <!-- Everything in here acts on the piece in front of you. -->
        <div class="tray this-one">
          <!-- The same two controls as the showcase bar, sharing its state —
               pressing either one moves both. -->
          <button
            type="button"
            class="minor play-toggle"
            :title="show.playing.value ? 'Pause' : 'Play'"
            :aria-label="show.playing.value ? 'Pause' : 'Play'"
            @click="toggleShowcase"
          >
            <ButtonIcon :glyph="show.playing.value ? 'pause' : 'play'" />
            <span class="says">{{ show.playing.value ? 'Pause' : 'Play' }}</span>
          </button>

          <button
            type="button"
            class="minor"
            title="Re-gen — the same piece, rolled again"
            aria-label="Re-gen — the same piece, rolled again"
            @click="regen"
          >
            <ButtonIcon glyph="regen" />
            <span class="says">Re-gen</span>
          </button>

          <!-- Phones only: the sidebar's palette chips can't come along, so
               colour is offered here as a step instead. The strip is the
               current set, so the button both says what it does and shows
               where you are — pressing it moves the stripes. -->
          <button
            v-if="hasPalette"
            type="button"
            class="minor recolour"
            :title="`Next palette — currently ${basePalette.name}`"
            :aria-label="`Next palette — currently ${basePalette.name}`"
            @click="nextPalette()"
          >
            <span class="strip" aria-hidden="true">
              <span
                v-for="c in basePalette.colors"
                :key="c"
                class="stripe"
                :style="{ background: c }"
              />
            </span>
            <span class="says">Palette</span>
          </button>

          <button type="button" class="see-framed" @click="openPreview">
            <!-- Drawn here rather than pulled from an icon set: it is two circles,
                 a bridge and two temples, and the app already draws its own mark.
                 Decorative, because the label beside it says the same thing. -->
            <svg class="specs" viewBox="0 0 26 11" aria-hidden="true" focusable="false">
              <g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <circle cx="6.6" cy="6.1" r="4.2" />
                <circle cx="19.4" cy="6.1" r="4.2" />
                <path d="M10.8,5.4 Q13,4.1 15.2,5.4" />
                <path d="M2.4,5.1 L0.9,2.6" />
                <path d="M23.6,5.1 L25.1,2.6" />
              </g>
            </svg>
            See it on a wall
          </button>
        </div>

        <!-- And this one does not: it throws the piece away and brings
             another. Hence the gap between them. -->
        <div class="tray other-one">
          <!-- "Random Piece" where there is room for it, because the noun is
               what distinguishes this from everything to its left: the others
               act on a piece, this one fetches one. A phone drops the noun to
               keep the button off a second line, and the tray it sits alone in
               has already made the same point by then. Swapped in the template
               rather than by CSS, so only one of the two is ever in the
               accessibility tree. -->
          <button
            type="button"
            class="minor roll"
            title="A different piece entirely"
            @click="randomize"
          >
            <ButtonIcon glyph="dice" />
            Random Piece
          </button>
        </div>
      </div>

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

/* Carried by the sidebar at every width that has one. */
.pocket {
  display: none;
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
  display: flex;
  align-items: center;
  /* Centred as a pair rather than left-aligned with the icon out on the edge:
     the button is full width and the label is what you read, so the glyph
     travels with it. */
  justify-content: center;
  gap: 0.45em;
  width: 100%;
  color: var(--ink-dim);
  font-size: 0.8rem;
}

/* Low-key on purpose: it has to be findable without competing with the name
   above it or the piece picker below. */
/* On the wordmark's line, pushed to the far end of it. */
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.ways-out {
  display: flex;
  flex: none;
  gap: 0.15rem;
}

/**
 * Square, quiet, and the same size whichever one it is.
 *
 * One holds a glyph and the other holds a question mark set in the interface
 * face, so the only way they read as a pair is for the box to be identical and
 * the content to be centred in it. The `?` is given the icon's weight rather
 * than the body's, or it sits lighter than the thing beside it.
 */
.way {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  color: var(--ink-dim);
  background: none;
  border-color: transparent;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1;
}

.way:hover,
.way:focus-visible {
  color: var(--ink);
  background: var(--panel-edge);
  border-color: transparent;
}

.rule {
  width: 100%;
  height: 1px;
  margin: 0;
  background: var(--panel-edge);
  border: 0;
}

.stage-area {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 0;
  min-width: 0;
  padding: 1.5rem;
}

/**
 * Sits under the piece, centred on it.
 *
 * Absolute rather than a second grid item, so the artwork stays centred in the
 * cell exactly as it was — the stage's sizing is a careful balance of
 * `aspect-ratio` against `max-width/height: 100%`, and giving the grid a
 * second child to place would have disturbed it.
 *
 * The centring lives here rather than on the buttons, which is why it is a row
 * at all: translating each of three children by half its own width would have
 * stacked them.
 */
.stage-controls {
  position: absolute;
  bottom: 0.9rem;
  left: 50%;
  display: flex;
  align-items: center;
  /* The gap between the two trays, and it is the whole point of them: four
     buttons at one spacing read as four equal offers, and one of them was not.
     Within a tray they sit at 0.4rem. */
  gap: 1.15rem;
  transform: translateX(-50%);
  /* Wrapping beats overflowing a narrow stage, and reversed so the accent
     button is the one that keeps the bottom line. */
  flex-wrap: wrap-reverse;
  justify-content: center;
  max-width: calc(100% - 2rem);
}

/**
 * Two trays, because there are two kinds of thing here.
 *
 * Pause, Re-gen, Palette and See it on a wall all address the piece on the
 * stage — stop it, roll it again, recolour it, hang it. Random does not: it
 * discards that piece and fetches an unrelated one. Sitting them in one even
 * row said they were peers, and the odd one out was the only destructive
 * press in the set.
 *
 * Pause and Re-gen lead, because they are what you reach for while looking.
 */
.tray {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap-reverse;
  justify-content: center;
}

/**
 * The two quiet ones.
 *
 * Deliberately not the accent: three accent buttons in a row would be three
 * things shouting and no answer to which one you came for. These carry the
 * panel's own surface, lifted enough to read against artwork of any colour.
 */
.stage-controls .minor {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.8rem;
  background: color-mix(in srgb, var(--panel) 88%, transparent);
  border-color: color-mix(in srgb, var(--panel-edge) 90%, transparent);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 6px 20px -8px rgb(0 0 0 / 70%);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.stage-controls .minor:hover,
.stage-controls .minor:focus-visible {
  background: var(--panel);
  transform: translateY(-2px);
  box-shadow: 0 12px 26px -10px rgb(0 0 0 / 75%);
}

/* The label swaps between Play and Pause, and the row is centred, so the
   button changing width would shift its neighbours. Both words in one cell,
   sized to the wider. */
.stage-controls .play-toggle {
  min-width: 6.1rem;
  justify-content: center;
}

/* The caption and its Random are the phone's arrangement; a desktop says all
   of this in the sidebar and has the room to say it in words. */
.plate-line {
  display: none;
}

/**
 * The one that leaves.
 *
 * Carries exactly the weight of its neighbours, and that is the point. It was
 * dimmed here once — quieter ink on a thinner surface — to say it belonged to
 * a different group, which is the same thing this app says when a button
 * cannot be pressed: `:disabled` is drawn as the button faded, nothing else.
 * So it read as unavailable, and it was the only control on the stage that
 * looked switched off while working perfectly.
 *
 * Grouping is spatial here instead. The gap between the trays is near three
 * times the gap inside one, and on a phone this button has a line to itself
 * under the accent — proximity says it is a separate thing without borrowing
 * a channel that already means something.
 */

/**
 * Colour as a step rather than a grid.
 *
 * Desktop has the whole set in the sidebar, so this is a phone control and
 * nothing else — hidden rather than conditionally rendered, which also takes
 * it out of the tab order at widths where it would be a duplicate.
 */
.stage-controls .recolour {
  display: none;
}

/* The current set, at chip scale. Five colours in a rounded sliver: it reads
   as "these colours", and the press visibly moves it on, which is the only
   feedback the button needs. */
.strip {
  display: flex;
  flex: none;
  width: 1.5rem;
  height: 0.72rem;
  overflow: hidden;
  border-radius: 2px;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 25%);
}

.strip .stripe {
  flex: 1;
}

/**
 * It was a whisper at first, revealed on hover, and nobody found it. It is a
 * real control now: the accent, full strength, sitting on the piece. The one
 * concession is that it lifts clear on hover rather than sitting there inert.
 */
.see-framed {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 1rem 0.45rem 0.85rem;
  color: var(--accent-ink);
  background: var(--accent);
  border-color: var(--accent-edge);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  box-shadow: 0 6px 20px -8px rgb(0 0 0 / 70%);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

/* In em, so it tracks the label rather than needing a second number if the
   button's size ever changes. Lifted a hair: the temples give the drawing more
   weight above its centre than below, so matching the box to the cap line
   lands it visually low. */
.see-framed .specs {
  flex: none;
  width: 1.65em;
  height: auto;
  transform: translateY(0.04em);
}

.see-framed:hover,
.see-framed:focus-visible {
  background: var(--accent-hot);
  border-color: var(--accent-edge);
  transform: translateY(-2px);
  box-shadow: 0 12px 26px -10px rgb(0 0 0 / 75%);
}

@media (prefers-reduced-motion: reduce) {
  .see-framed,
  .stage-controls .minor {
    transition: none;
  }

  .see-framed:hover,
  .see-framed:focus-visible,
  .stage-controls .minor:hover,
  .stage-controls .minor:focus-visible {
    transform: none;
  }
}

/**
 * Below this the app stops being an instrument and becomes a window.
 *
 * The number is not a guess. The sidebar is a fixed 288px track, so on a 402px
 * phone it takes 288 and leaves the artwork 114 — a full-height control column
 * beside a postage stamp. Operating wants a desktop and always did; looking
 * does not, and a link shared from here is opened on a phone more often than
 * anywhere else, so the one thing that must not break is seeing the piece.
 *
 * What survives is the whole of the looking: the work full-bleed, and the tray
 * under it — play, re-gen, roll a new piece, see it on a wall. What goes is
 * the sidebar, which is the operating.
 */
@media (max-width: 700px) {
  .app {
    grid-template-columns: 1fr;
    /* minmax(0,1fr) rather than 1fr: a grid row sized to its content refuses
       to shrink below it, and the stage would push the tray off the bottom. */
    grid-template-rows: auto minmax(0, 1fr);
  }

  .sidebar {
    display: none;
  }

  .pocket {
    display: grid;
    grid-template-columns: auto auto;
    align-items: center;
    justify-content: space-between;
    gap: 0.25rem 1rem;
    padding: 0.7rem 0.9rem;
    background: var(--panel);
    border-bottom: 1px solid var(--panel-edge);
  }

  .pocket .note {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--ink-dim);
    font-size: 0.72rem;
    line-height: 1.35;
  }

  /**
   * The offer, directly under the sentence that just said what a phone cannot
   * do. It is the answer to that sentence, so it reads as part of it rather
   * than as another control in the header.
   */
  .pocket .keep {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.15rem;
  }

  /* Full width and in the accent, which no other button in this header is: it
     is the one thing here worth being asked for, and a thumb finds an edge-to-
     edge target without aiming. */
  .pocket .keepsake {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    width: 100%;
    padding: 0.55rem 0.9rem;
    color: var(--accent-ink);
    background: var(--accent);
    border-color: var(--accent-edge);
    font-size: 0.84rem;
    font-weight: 600;
    letter-spacing: 0.04em;
  }

  .pocket .keepsake:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  /* The pixel size before the press, what happened after it. Two lines' worth
     of room is held from the start, because the answer is longer than the
     offer — mid-playback it also says the piece was paused — and growing the
     header would push the artwork down the screen at the moment you were
     looking at it. */
  .pocket .said {
    min-height: 2.7em;
    margin: 0;
    color: var(--ink-dim);
    font-size: 0.7rem;
    line-height: 1.35;
    text-align: center;
  }

  /* The work gets the room the sidebar was taking, and takes it from the top.
     
     Centred, the slack between the header and the tray is split above and
     below the piece, which puts a band of empty panel under a header that is
     already the tallest thing on the screen and pushes the artwork down past
     the middle of the phone. Aligned to the start, all of that slack falls to
     the bottom — where the tray is absolutely placed anyway, so it lands in
     space the piece was being overlaid with rather than in space nothing was
     using. Horizontal centring is untouched: `place-items` set both, and only
     the block axis is wrong here. */
  .stage-area {
    align-items: start;
    padding: 0.75rem;
  }

  /**
   * The plate, and the end of the tray that sat on the artwork.
   *
   * Three rows of chips floating over the bottom of the piece covered about a
   * fifth of the only thing this screen exists to show, and the piece was not
   * smaller for it — just partly hidden, which is worse. The controls come off
   * the art entirely and take a row of their own beneath it. The piece loses
   * some height and gets all of itself back, and an uncovered small piece
   * reads better than a large one with a bar across its feet.
   *
   * Full-bleed, in the panel colour, with an edge along the top: the same
   * surface as the header, so the artwork is held between two pieces of the
   * app's own furniture rather than having one of them laid on top of it.
   */
  .stage-area {
    align-items: start;
    /* Two rows: the piece takes everything left over, the plate takes what it
       needs. minmax(0,1fr) rather than 1fr so `max-height: 100%` on the stage
       has a definite row to resolve against and the plate is never pushed off
       the bottom. */
    grid-template-rows: minmax(0, 1fr) auto;
    padding: 0.75rem 0.75rem 0;
  }

  .stage-controls {
    position: static;
    justify-self: stretch;
    flex-direction: column;
    align-items: stretch;
    gap: 0.4rem;
    width: auto;
    max-width: none;
    margin: 0.75rem -0.75rem 0;
    padding: 0.5rem 0.9rem 0.7rem;
    background: var(--panel);
    border-top: 1px solid var(--panel-edge);
    transform: none;
  }

  /* The caption and the way out of this piece, on one line. */
  .plate-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }

  /* One line, and it truncates from the right — the seed is last because it is
     the least readable thing in the sentence and the first worth losing. */
  .ident {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    color: var(--ink-dim);
    font-size: 0.72rem;
    line-height: 1.3;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .ident .dot {
    margin: 0 0.35em;
    opacity: 0.55;
  }

  /* Monospace, because it is a key rather than a word: it is the one part of
     the caption someone might read back a character at a time. */
  .ident .which {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.95em;
  }

  /**
   * Text, not a chip.
   *
   * Everything below is a filled rounded chip that acts on the piece. This one
   * fetches a different piece, so it is not drawn as one of them — and it is
   * at full ink while it says so, because the last thing that marked this
   * button as different did it by fading, which is what this app's `:disabled`
   * looks like.
   */
  .elsewhere {
    display: flex;
    flex: none;
    align-items: center;
    gap: 0.4rem;
    padding: 0.2rem 0.1rem;
    color: var(--ink);
    background: none;
    border: 0;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .elsewhere:hover,
  .elsewhere:focus-visible {
    color: var(--accent);
    background: none;
  }

  /* The desktop pairing is the caption line's job here. */
  .stage-controls .other-one {
    display: none;
  }

  .tray {
    width: 100%;
    flex-wrap: nowrap;
    gap: 0.4rem;
  }

  /**
   * The three quiet ones go wordless, and their words move into the caption.
   *
   * It buys the accent a place on the same line — labelled, which it has to be
   * — and it is affordable only because these particular three are the most
   * self-evident marks in the app: a triangle, a circling arrow, and a literal
   * strip of the colours it will give you. Each keeps its label in `title` and
   * `aria-label`, and the caption above reports what the press did: the seed
   * moves under the arrow, the palette name under the strip.
   */
  .stage-controls .minor {
    flex: none;
    justify-content: center;
    min-width: 0;
    padding: 0.5rem 0.65rem;
    background: var(--panel-edge);
    border-color: color-mix(in srgb, var(--panel-edge) 70%, var(--ink));
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    box-shadow: none;
  }

  /* The chips sit on the panel here rather than over artwork, so they are
     filled from the edge colour to lift off it — which inverts the shared
     hover, where going to `--panel` is a step up from a translucent chip and
     here would be a step down. */
  .stage-controls .minor:hover,
  .stage-controls .minor:focus-visible {
    background: color-mix(in srgb, var(--panel-edge) 72%, var(--ink));
  }

  .stage-controls .minor .says {
    /* Not `display: none` on the button itself — the name has to survive for
       the screen reader, and it does, in aria-label. */
    display: none;
  }

  .stage-controls .recolour {
    display: flex;
  }

  /* Takes the rest of the row. It is the one thing here worth being asked for
     and a thumb should not have to aim for it. */
  .stage-controls .see-framed {
    flex: 1;
    min-width: 0;
    justify-content: center;
    padding: 0.5rem 0.75rem;
    box-shadow: none;
  }
}
</style>
