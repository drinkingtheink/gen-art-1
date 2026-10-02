<script setup>
import { computed, onMounted, onUnmounted, useTemplateRef } from 'vue'
import GenArtMark from './GenArtMark.vue'
import JhMonogram from './JhMonogram.vue'
import ButtonIcon from './ButtonIcon.vue'
import { generators } from '../generators/index.js'
import { palettes } from '../core/palettes.js'
import { getRatio, ratios } from '../core/ratios.js'
import { MAX_RASTER_EDGE, PNG_SCALES } from '../core/export.js'
import { SEED_COUNT } from '../core/rng.js'

/**
 * What this is and how to print it.
 *
 * The counts are read from the registries rather than written out, because a
 * page that says "twenty generators" is wrong the moment a twenty-first lands
 * and nobody thinks to look here.
 *
 * The photographers are credited under their own rooms in the gallery, which
 * is where someone looking at a room would ask. A second list here would be a
 * second thing to keep current for no one's benefit.
 */

/**
 * Every piece that could be started, before a single dial is touched.
 *
 * Computed for the same reason the counts are: multiplied out by hand it goes
 * stale the moment a generator or a palette lands. The dials are counted the
 * same way — the median generator's continuous params, which is what decides
 * whether the number after this one reads as "a dozen" honestly.
 */
const starts = computed(
  () => generators.length * ratios.length * palettes.length * SEED_COUNT,
)

const dials = computed(() => {
  const counts = generators
    .map((g) => g.params.filter((p) => p.type === 'range').length)
    .sort((a, b) => a - b)
  return counts[counts.length >> 1]
})

/**
 * ISO 216, in millimetres. Physical constants, so these are written down —
 * nothing in the app can change what A3 is.
 */
const PAPER = [
  { name: 'A4', w: 210, h: 297 },
  { name: 'A3', w: 297, h: 420 },
  { name: 'A2', w: 420, h: 594 },
  { name: 'A1', w: 594, h: 841 },
  { name: 'A0', w: 841, h: 1189 },
]

/**
 * What to export for each one, worked out rather than written down.
 *
 * It depends on three things the app owns — the A-series canvas, the raster
 * clamp and the multipliers the PNG menu offers — so typed out it would be
 * wrong the first time any of them moved, and wrong quietly. The answer is in
 * multipliers you can actually pick: A3 needs 4.2x, and since the menu goes 1,
 * 2, 4, 8 the answer is 8x.
 */
const MM_PER_INCH = 25.4
const DPI = 300
const sheet = getRatio('a-portrait')
const longEdge = Math.max(sheet.width, sheet.height)

const sizes = PAPER.map((paper) => {
  const scale = PNG_SCALES.find((s) => {
    const used = Math.min(s, MAX_RASTER_EDGE / longEdge)
    return ((longEdge * used) / DPI) * MM_PER_INCH >= paper.h
  })
  const inch = (mm) => (mm / MM_PER_INCH).toFixed(1)
  return {
    ...paper,
    inches: `${inch(paper.w)} × ${inch(paper.h)} in`,
    mm: `${paper.w} × ${paper.h} mm`,
    how: scale ? `PNG at ${scale}×` : 'SVG',
  }
})

const shapes = ratios.length

const emit = defineEmits(['dismiss'])

const closer = useTemplateRef('closer')
let returnTo = null

function onKey(event) {
  if (event.key === 'Escape') emit('dismiss')
}

/**
 * A press on the surround leaves, exactly as it does in the gallery — same
 * guards for the same two reasons. A click is delivered to the common
 * ancestor of press and release, so selecting text in the sheet and letting go
 * past its edge would otherwise close the panel out from under you; and this
 * element is the scrolling box, so a press on its own scrollbar targets it
 * just as the backdrop does.
 */
let pressedOutside = false

function onPress(event) {
  pressedOutside =
    event.target === event.currentTarget &&
    event.offsetX <= event.currentTarget.clientWidth &&
    event.offsetY <= event.currentTarget.clientHeight
}

function onSurroundClick(event) {
  const leaving = pressedOutside && event.target === event.currentTarget
  pressedOutside = false
  if (leaving) emit('dismiss')
}

onMounted(() => {
  returnTo = document.activeElement
  window.addEventListener('keydown', onKey)
  closer.value?.focus()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  if (returnTo?.isConnected) returnTo.focus()
})
</script>

<template>
  <div
    class="about"
    role="dialog"
    aria-modal="true"
    aria-labelledby="about-title"
    @pointerdown="onPress"
    @click="onSurroundClick"
  >
    <div class="sheet">
      <header class="head">
        <div>
          <h2 id="about-title">About gen<span class="sep">·</span>Art</h2>
          <p class="who">Generative artwork for a wall or a homepage</p>
        </div>
        <p class="crest" aria-hidden="true"><GenArtMark /></p>
        <button ref="closer" type="button" class="leave" @click="emit('dismiss')">
          <ButtonIcon glyph="back" />
          Back to the studio
        </button>
      </header>

      <div class="body">
        <section>
          <h3>What this is</h3>
          <p>
            Every piece is a program, not a picture. {{ generators.length }} generators, each a pure
            function of a seed and a few numbers. {{ palettes.length }} palettes,
            {{ shapes }} canvas shapes.
          </p>
          <p>
            Nothing is stored or uploaded. The link carries everything, so it rebuilds the piece
            exactly — down to the last decimal.
          </p>
          <p>
            <strong>Every Pause a Masterpiece</strong> is the method. Play, and the piece drifts
            through its own parameters. Pause, and that frame <em>is</em> the piece — kept at full
            precision, not snapped back to the nearest slider step. That frame is what the link
            carries and what you export.
          </p>
          <p>
            Which is why yours is yours. There are
            <strong>{{ starts.toLocaleString() }}</strong> places to begin — every generator against
            every shape, palette and seed — and from any of them about
            {{ dials }} dials move continuously and are recorded exactly where you stopped them.
            Nobody arrives at your frame by accident.
          </p>
        </section>

        <section>
          <h3>Printing</h3>
          <p>
            <strong>SVG</strong> is vector: no size limit, and a pen plotter draws it straight from
            the file. <strong>PNG</strong> is pixels, 1× to 8×, capped at 8192px — about 27 inches
            on the long edge.
          </p>
          <table class="sizes">
            <thead>
              <tr>
                <th>Paper</th>
                <th>Millimetres</th>
                <th>Inches</th>
                <th>Export</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="size in sizes" :key="size.name">
                <td>{{ size.name }}</td>
                <td>{{ size.mm }}</td>
                <td>{{ size.inches }}</td>
                <td>{{ size.how }}</td>
              </tr>
            </tbody>
          </table>
          <p class="note">
            Those are for the A-series canvas — <strong>√2:1</strong> is 1189 × 841, A0 in
            millimetres, so it lands on any of them uncropped. Other shapes differ; the line under
            the PNG button always gives the real inches.
          </p>
          <p class="note">
            Grain and effects are raster — a PNG keeps them, a plotter ignores them and draws the
            paths. Colours are sRGB.
          </p>
        </section>

        <section>
          <h3>Colophon</h3>
          <!-- What it is built with is a developer's question and there is a
               link to the source right here for anyone asking it. What is left
               is the one fact a person using this needs: no re-drawing, no
               re-encoding, no second version of the work. -->
          <p>
            The artwork is SVG throughout — what is on screen is the document you export, not a
            copy of it.
          </p>
          <!-- The mark is part of the link rather than a decoration sitting
               beside one. It already lit to the accent on hover, so it was
               behaving like a link before it was one. Hidden from a screen
               reader because the words next to it are its name. -->
          <p class="sign">
            <a
              class="maker"
              href="https://www.drinkingtheink.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <JhMonogram aria-hidden="true" />
              <span>drinkingtheink.com</span>
            </a>
            <a
              href="https://github.com/drinkingtheink/gen-art-1"
              target="_blank"
              rel="noopener noreferrer"
              >Source on GitHub</a
            >
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Same curves and the same weighting as the gallery: the frost fades, the
   sheet rises into it, and leaving is quicker than arriving because the
   decision has already been made. */
.about-enter-active {
  transition: opacity 260ms cubic-bezier(0.2, 0.7, 0.3, 1);
}

.about-leave-active {
  transition: opacity 180ms cubic-bezier(0.4, 0, 0.6, 1);
  pointer-events: none;
}

.about-enter-from,
.about-leave-to {
  opacity: 0;
}

.about-enter-active .sheet {
  transition: transform 260ms cubic-bezier(0.2, 0.7, 0.3, 1);
}

.about-leave-active .sheet {
  transition: transform 180ms cubic-bezier(0.4, 0, 0.6, 1);
}

.about-enter-from .sheet,
.about-leave-to .sheet {
  transform: translateY(14px) scale(0.985);
}

@media (prefers-reduced-motion: reduce) {
  .about-enter-active,
  .about-leave-active,
  .about-enter-active .sheet,
  .about-leave-active .sheet {
    transition-duration: 1ms;
  }

  .about-enter-from .sheet,
  .about-leave-to .sheet {
    transform: none;
  }
}

.about {
  position: fixed;
  inset: 0;
  z-index: 12;
  overflow-y: auto;
  padding: 2rem 1rem 3rem;
  background: transparent;
}

/* A ::before is its element's first child, so at an equal z-index the sheet
   would paint under it. */
.about::before {
  position: fixed;
  inset: 0;
  z-index: 1;
  background: color-mix(in srgb, var(--bg) 80%, transparent);
  backdrop-filter: blur(14px) saturate(1.2);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  content: '';
  pointer-events: none;
}

.sheet {
  position: relative;
  z-index: 2;
  max-width: 720px;
  margin: 0 auto;
  padding: 1.4rem 1.6rem 1.8rem;
  border: 1px solid color-mix(in srgb, var(--panel-edge) 80%, transparent);
  border-radius: 16px;
  /* Near-solid, where the gallery's sheet is 74%. That one is filled edge to
     edge with opaque photographs; this one is text, and text over a piece that
     is still moving underneath it is not readable at any blur. */
  background: color-mix(in srgb, var(--panel) 97%, transparent);
  box-shadow: 0 24px 60px rgb(0 0 0 / 45%);
}

.head {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
}

.crest {
  margin: 0;
  font-size: 2.2rem;
  line-height: 1;
}

/* The mark carries a right margin for standing beside the wordmark. Alone and
   centred it has nothing to stand beside. */
.crest svg {
  margin: 0;
}

.leave {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  justify-self: end;
}

/* The separator takes the accent, as it does in the wordmark itself. No
   negative margin here: that one is pulling against a flex row's gap, and this
   is ordinary inline text. */
.sep {
  color: var(--accent);
}

h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.who {
  margin: 0.2rem 0 0;
  color: var(--ink-dim);
  font-size: 0.8rem;
}

.body {
  margin-top: 1.6rem;
  /* Measured rather than full width: long lines are hard to come back to, and
     this is the one screen in the app that is read rather than operated. */
  max-width: 58ch;
}

section + section {
  margin-top: 1.7rem;
}

h3 {
  margin: 0 0 0.5rem;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
}

p {
  margin: 0 0 0.7rem;
  font-size: 0.88rem;
  line-height: 1.65;
  color: var(--ink);
}

p:last-child {
  margin-bottom: 0;
}

.note {
  color: var(--ink-dim);
  font-size: 0.82rem;
}

/* The one thing on this page that is a lookup rather than a read. Right-align
   the answer column so the eye runs down PNG / PNG / PNG / SVG / SVG and sees
   where the line falls without reading a word of it. */
.sizes {
  width: 100%;
  margin: 0.9rem 0;
  border-collapse: collapse;
  font-size: 0.84rem;
}

.sizes th {
  padding: 0 0 0.35rem;
  color: var(--ink-dim);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: left;
  border-bottom: 1px solid color-mix(in srgb, var(--panel-edge) 70%, transparent);
}

.sizes td {
  padding: 0.34rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--panel-edge) 45%, transparent);
  color: var(--ink-dim);
}

.sizes tr:last-child td {
  border-bottom: 0;
}

.sizes td:first-child {
  color: var(--ink);
  font-weight: 600;
}

.sizes th:last-child,
.sizes td:last-child {
  text-align: right;
}

strong {
  color: var(--ink);
  font-weight: 600;
}

a {
  color: var(--ink);
  text-decoration: underline;
  text-underline-offset: 2px;
}

a:hover {
  color: var(--accent);
}

.sign {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem 1.1rem;
  margin-top: 1.1rem;
  font-size: 0.84rem;
}

.maker {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  /* The rule underlines links, and an underline running under the mark and the
     gap looks like a mistake. The name carries it instead. */
  text-decoration: none;
}

.maker span {
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Hovering anywhere on the link lights the mark, not just the mark itself —
   the component's own `:hover` only fires over the glyph. */
.maker:hover :deep(.monogram *) {
  fill: var(--accent);
  animation-play-state: paused;
}

/* Sized by width, which is how the component is built: it sets its own width
   and lets the height follow from the viewBox. */
.sign :deep(.monogram) {
  width: 22px;
}
</style>
