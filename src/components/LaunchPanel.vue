<script setup>
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import ButtonIcon from './ButtonIcon.vue'
import GenArtMark from './GenArtMark.vue'
import LaunchBackdrop from './LaunchBackdrop.vue'
import { launchPiecesFor, renderThumbnail } from '../core/launch.js'
import { getRatio } from '../core/ratios.js'

/**
 * The front door, shown when a visit names no piece.
 *
 * A generative gallery that opens straight onto one piece gives no sense that
 * the rest exist, so a bare visit gets the whole set
 * as thumbnails plus a way to hand the choice to chance entirely.
 *
 * Every card is a real piece — the thumbnail is generated from the same state
 * clicking it applies — so nothing on this screen is a promise the studio then
 * fails to keep. The same goes for the backdrop: a real piece on a real
 * showcase preset, playing behind the glass, so the studio has demonstrated
 * itself before a word of this has been read.
 */

const emit = defineEmits(['pick', 'randomize', 'dismiss', 'about'])

/**
 * The shape every card is drawn and opened at.
 *
 * Decided by the app rather than here, because it follows the same breakpoint
 * the sidebar does and that number lives in App.vue. A card is the piece
 * clicking it opens, so this is the one setting that has to reach both the
 * thumbnail and the state behind it.
 */
const props = defineProps({
  shape: { type: String, default: 'square' },
})

const pieces = computed(() => launchPiecesFor(props.shape))

/** The cards' aspect, taken from the ratio so the box matches the artwork. */
const thumbAspect = computed(() => {
  const ratio = getRatio(props.shape)
  return `${ratio.width} / ${ratio.height}`
})

/**
 * Thumbnails arrive one per frame rather than all at once.
 *
 * Generating them all still costs enough in one pass that the panel would
 * appear frozen before it appeared at all. Built a frame at a time, the browser
 * paints between pieces and the grid fills in visibly instead.
 */
const thumbnails = ref({})
let urls = []
let frame = 0
let stopped = false

/** Hand the blobs back. A rebuild drops twenty of them and so does leaving. */
function releaseUrls() {
  for (const url of urls) URL.revokeObjectURL(url)
  urls = []
}

function build(index) {
  if (stopped || index >= pieces.value.length) return
  const piece = pieces.value[index]
  try {
    const markup = renderThumbnail(piece)
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }))
    urls.push(url)
    thumbnails.value = { ...thumbnails.value, [piece.generator.id]: url }
  } catch {
    // A card whose thumbnail failed is still a working button — it keeps its
    // placeholder rather than taking the panel down.
  }
  frame = requestAnimationFrame(() => build(index + 1))
}

/**
 * Crossing the breakpoint redraws the grid.
 *
 * The thumbnails are rasterised SVG at a fixed canvas, so they cannot simply
 * be restretched into the new box — a square piece in a portrait frame is a
 * squashed piece, and it would also stop being what clicking it opens. Rare
 * enough to rebuild from scratch: a phone turning on its side, or a window
 * dragged across 700px.
 */
watch(
  () => props.shape,
  () => {
    cancelAnimationFrame(frame)
    releaseUrls()
    thumbnails.value = {}
    build(0)
  },
)

const dice = useTemplateRef('dice')

function onKey(event) {
  if (event.key === 'Escape') emit('dismiss')
}

onMounted(() => {
  build(0)
  window.addEventListener('keydown', onKey)
  // Keyboard and screen-reader users land on the one control that needs no
  // reading — and it's the first thing in the panel, so nothing scrolls.
  dice.value?.focus()
})

onUnmounted(() => {
  stopped = true
  cancelAnimationFrame(frame)
  window.removeEventListener('keydown', onKey)
  releaseUrls()
})
</script>

<template>
  <div class="launch" role="dialog" aria-modal="true" aria-labelledby="launch-title">
    <LaunchBackdrop />

    <div class="sheet">
      <header class="head">
        <div class="titles">
          <h1 id="launch-title" class="wordmark"><GenArtMark />gen<span>·</span>art</h1>
          <p class="tagline">Every Pause a Masterpiece</p>
          <p class="blurb">
            Generative artwork for a wall or a homepage. Move parameters until a piece is yours,
            then keep the moment you stopped on — get an SVG or PNG big enough to print any size and
            hang, or CSS for your digital project.
          </p>
        </div>

        <!-- The same question the studio's info button asks, in the one place
             someone is still deciding whether to bother. It opens over this
             panel rather than past it: the picker is not a step to get through
             on the way to reading about the thing, so closing About puts the
             choice back exactly where it was. -->
        <button type="button" class="about" @click="emit('about')">
          <ButtonIcon glyph="info" />
          About
        </button>
      </header>

      <button ref="dice" type="button" class="dice" @click="emit('randomize')">
        <span class="dice-label">Start From Randomized Piece</span>
        <span class="dice-note">A piece at random, on a random canvas, with every parameter rolled</span>
      </button>

      <p class="or"><span>or choose a piece</span></p>

      <ul class="grid">
        <li v-for="piece in pieces" :key="piece.generator.id">
          <button type="button" class="card" @click="emit('pick', piece.state)">
            <span class="thumb" :style="{ aspectRatio: thumbAspect }">
              <!-- Empty alt on purpose: the piece's name sits right below it,
                   and an artwork has no text to transcribe. -->
              <img v-if="thumbnails[piece.generator.id]" :src="thumbnails[piece.generator.id]" alt="" />
            </span>
            <span class="meta">
              <span class="name">{{ piece.generator.name }}</span>
              <span class="note">{{ piece.generator.blurb }}</span>
            </span>
          </button>
        </li>
      </ul>

      <button type="button" class="skip" @click="emit('dismiss')">Skip — just open the studio</button>
    </div>
  </div>
</template>

<style scoped>
.launch {
  position: fixed;
  inset: 0;
  z-index: 10;
  overflow-y: auto;
  padding: 2.5rem 1rem 3rem;
  /* No colour of its own — the piece playing behind it is the background. */
  background: transparent;
}

/* The frosted glass, over the whole screen rather than just the panel.
   Everything painted before it in this stacking context — which is the
   backdrop and nothing else — gets blurred, so the piece reads as movement and
   colour across the entire background instead of only where the sheet
   overlaps it.

   The tint on top holds the screen to roughly one brightness whichever of the
   fifty palettes came up: their backgrounds run from a near-black laser to an
   all but white moss, and the text has to survive both. Graded slightly darker
   at the edges, where there is nothing but artwork. */
.launch::before {
  position: fixed;
  inset: 0;
  /* Above the backdrop, explicitly. A ::before counts as its element's first
     child, so at an equal z-index the artwork paints on top of it and there is
     nothing behind the frost left to blur. */
  z-index: 1;
  background: radial-gradient(
    ellipse at 50% 42%,
    color-mix(in srgb, var(--bg) 46%, transparent),
    color-mix(in srgb, var(--bg) 70%, transparent) 75%
  );
  /* Enough to frost, not enough to erase. Past about 20px the finer pieces —
     truchet's tiles, a phyllotaxis' dots — dissolve into a plain gradient and
     there is no movement left to see, which is the one thing this is for. */
  backdrop-filter: blur(13px) saturate(1.3);
  -webkit-backdrop-filter: blur(13px) saturate(1.3);
  content: '';
  pointer-events: none;
}

.sheet {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  max-width: 1040px;
  margin: 0 auto;
  padding: 1.6rem 1.5rem 1.8rem;
  border: 1px solid color-mix(in srgb, var(--panel-edge) 80%, transparent);
  border-radius: 16px;
  /* No blur of its own — the frost above covers the full screen, so the sheet
     only needs enough tint to separate itself from the background it sits on
     and to carry the text. */
  background: color-mix(in srgb, var(--panel) 66%, transparent);
  box-shadow: 0 24px 60px rgb(0 0 0 / 45%);
}

/* The panel's own secondary ink, brighter than the studio's --ink-dim.
   The sidebar's dim grey is tuned for flat panel colour; here the same grey
   sits on frosted artwork and goes muddy, so everything secondary on this
   screen steps up. */
.launch {
  --launch-dim: #d2d2db;
}

.head {
  display: flex;
  align-items: start;
  gap: 1rem;
  justify-content: space-between;
}

.titles {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

/* Quiet, and quiet the same way `.skip` is: these are the two things on this
   panel that are not choosing a piece, and they should read as a pair rather
   than as two differently-weighted asides. */
.about {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.4rem;
  color: var(--launch-dim);
  background: none;
  border-color: transparent;
  font-size: 0.8rem;
}

.about:hover {
  color: var(--ink);
  background: none;
  border-color: var(--panel-edge);
}

.wordmark {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0;
  font-size: 1.7rem;
  font-family: var(--wordmark);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.wordmark span {
  color: var(--accent);
  margin: -5px;
}

/* Between the name and the explanation: larger than the sidebar's, because
   the wordmark it sits under is larger, and in the panel's brighter secondary
   ink so it reads as part of the title rather than as the first line of the
   paragraph below it. */
.tagline {
  margin: 0;
  color: var(--ink);
  font-family: var(--wordmark);
  font-size: 1.3rem;
  font-weight: 500;
  letter-spacing: 0.005em;
}

.blurb {
  /* Wide enough that the sentence sets in two lines rather than leaving a
     single word stranded on a third, and still inside a comfortable measure. */
  max-width: 72ch;
  margin: 0;
  color: var(--launch-dim);
  font-size: 0.92rem;
  line-height: 1.5;
}

/* The one control on the panel that needs no deciding, so it gets the weight. */
.dice {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1.5rem 1.25rem;
  color: var(--accent-ink);
  background: var(--accent);
  border-color: var(--accent-edge);
  text-align: left;
  /* The sheen below is a child that travels past the edges. */
  overflow: hidden;
  /* Eased rather than linear: it settles into place instead of arriving and
     stopping, which is most of what makes a hover read as expensive. */
  transition:
    transform 240ms cubic-bezier(0.2, 0.7, 0.3, 1),
    box-shadow 240ms cubic-bezier(0.2, 0.7, 0.3, 1),
    background-color 240ms ease;
}

/**
 * A light passing across the face.
 *
 * Parked off the left edge and sent across on hover, once — not a loop, which
 * would read as a loading state rather than as a response. Angled slightly off
 * vertical so it sweeps like a reflection rather than a wipe, and narrow
 * enough to suggest a gloss rather than wash the label out.
 */
.dice::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    102deg,
    transparent 38%,
    rgb(255 255 255 / 34%) 50%,
    transparent 62%
  );
  transform: translateX(-115%);
  transition: transform 780ms cubic-bezier(0.2, 0.7, 0.3, 1);
  content: '';
  pointer-events: none;
}

.dice:hover,
.dice:focus-visible {
  background: var(--accent-hot);
  border-color: var(--accent-edge);
  /* A single pixel. More and it stops being a button and starts being a card
     that moves. The shadow is tinted with the accent rather than black, so it
     reads as the button's own light rather than as something cast on it. */
  transform: translateY(-1px);
  box-shadow: 0 12px 30px -14px color-mix(in srgb, var(--accent) 75%, transparent);
}

.dice:hover::after,
.dice:focus-visible::after {
  transform: translateX(115%);
}

/* Pressed, it settles back onto the surface. */
.dice:active {
  transform: translateY(0);
  box-shadow: none;
  transition-duration: 80ms;
}

.dice-label {
  font-size: clamp(1.15rem, 2.6vw, 1.5rem);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1.1;
}

.dice-note {
  font-size: 0.82rem;
  opacity: 0.88;
}

.or {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.2rem 0 0;
  color: var(--launch-dim);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.or::before,
.or::after {
  flex: 1;
  height: 1px;
  background: var(--panel-edge);
  content: '';
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 0.9rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Two columns, stated rather than fitted.
   
   `auto-fill` at 168px wants 349px to place a second column and a 390px phone
   leaves 342 inside the sheet, so it drops to one — which was survivable while
   the cards were square and is not now they are upright: one column of
   portraits is a 470px card and 9,400px of scrolling to see twenty of them.
   Two columns halve that and still leave each card wider than the thumbnails
   the desktop grid shows. */
@media (max-width: 700px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem;
  }
}

.card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0;
  overflow: hidden;
  background: var(--panel);
  text-align: left;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.card:hover {
  background: var(--panel);
  border-color: var(--accent);
  transform: translateY(-2px);
}

.card:active {
  transform: none;
}

/* The aspect is bound per card from the ratio in use, because the cards are
   square where there is room for a grid and upright where there is not. */
.thumb {
  display: block;
  background: #101015;
  border-bottom: 1px solid var(--panel-edge);
}

/* Until its piece has been generated the tile pulses, so a grid still filling
   in reads as loading rather than as broken. */
.thumb:empty {
  animation: breathe 1.6s ease-in-out infinite;
}

.thumb img {
  display: block;
  width: 100%;
  height: 100%;
}

@keyframes breathe {
  50% {
    background: #191921;
  }
}

@media (prefers-reduced-motion: reduce) {
  .thumb:empty {
    animation: none;
  }

  .card:hover {
    transform: none;
  }

  /* The colour change stays — that is the part saying the button is live. The
     travelling light and the lift are the parts that move. */
  .dice,
  .dice::after {
    transition: background-color 240ms ease;
  }

  .dice:hover,
  .dice:focus-visible {
    transform: none;
  }

  .dice:hover::after,
  .dice:focus-visible::after {
    transform: translateX(-115%);
  }
}

.meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.55rem 0.65rem 0.7rem;
}

.name {
  font-size: 0.85rem;
  font-weight: 600;
}

.note {
  color: var(--launch-dim);
  font-size: 0.74rem;
  line-height: 1.35;
}

.skip {
  align-self: center;
  color: var(--launch-dim);
  background: none;
  border-color: transparent;
  font-size: 0.8rem;
}

.skip:hover {
  color: var(--ink);
  background: none;
  border-color: var(--panel-edge);
}
</style>
