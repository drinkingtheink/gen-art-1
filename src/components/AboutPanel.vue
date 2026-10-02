<script setup>
import { onMounted, onUnmounted, useTemplateRef } from 'vue'
import GenArtMark from './GenArtMark.vue'
import JhMonogram from './JhMonogram.vue'
import ButtonIcon from './ButtonIcon.vue'
import { frames, rooms } from '../core/mounts.js'
import { generators } from '../generators/index.js'
import { palettes } from '../core/palettes.js'
import { ratios } from '../core/ratios.js'

/**
 * What this is, how to print it, and who the photographs belong to.
 *
 * The counts and the credits are read from the registries rather than written
 * out, because a page that says "twenty generators" is wrong the moment a
 * twenty-first lands and nobody thinks to look here. The same goes for the
 * photographers: a room cannot be added without its credit, and this cannot
 * fall behind the rooms.
 */

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
          <h2 id="about-title">About</h2>
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
            Every piece here is a small program rather than a picture. There are
            {{ generators.length }} of them, and each one is a pure function of a seed and a handful
            of numbers — move any number and the piece answers at once. {{ palettes.length }}
            palettes and {{ ratios.length }} canvas shapes sit on top of that.
          </p>
          <p>
            Nothing is stored and nothing is uploaded. A link carries the generator, the seed and
            every parameter, so the piece is rebuilt from the address alone — which is why a link
            you send someone opens on exactly what you were looking at, down to the last decimal.
          </p>
        </section>

        <section>
          <h3>Printing</h3>
          <p>
            These are built to be printed, and the two export buttons are for two different jobs.
          </p>
          <dl>
            <dt>SVG, for anything large</dt>
            <dd>
              Real vector — shapes and coordinates, not pixels — so it enlarges without limit and
              without softening. This is the file to hand a print shop for anything above about A2,
              and a pen plotter will read it and draw the paths directly.
            </dd>

            <dt>PNG, for everything else</dt>
            <dd>
              Choose 1× to 8×. The line under the button gives the size in inches at 300dpi, which
              is what a shop means by photographic quality — so you can see what you are getting
              before you commit. The largest comes to roughly 27 inches on the long edge; past that
              the answer is the SVG.
            </dd>

            <dt>The A-series shapes are real paper</dt>
            <dd>
              <strong>√2:1</strong> is 1189 × 841, which is A0 in millimetres. A piece made in that
              shape drops onto A0, A1, A2 or A3 with nothing cropped and no white edge to trim.
            </dd>
          </dl>
          <p class="note">
            Grain and the effects are raster: they come through on a PNG, and a plotter quietly
            ignores them and draws the artwork underneath. Colours are sRGB, which is worth telling
            whoever prints it.
          </p>
        </section>

        <section>
          <h3>Seeing it on a wall first</h3>
          <p>
            <strong>See it on a wall</strong>, under the piece, hangs the work in a photographed
            room — {{ rooms.length }} of them, in {{ frames.length }} framings, at the size it would
            actually hang. Two of the walls are not square to the camera, so the piece is laid onto
            them in perspective rather than pasted flat. It is a way to settle how big to print and
            what to frame it in before paying for either.
          </p>
        </section>

        <section>
          <h3>The photographs</h3>
          <p>
            The rooms are other people's work, used with thanks. All from
            <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">Unsplash</a>.
          </p>
          <ul class="credits">
            <li v-for="room in rooms" :key="room.id">
              <span>{{ room.name }}</span>
              <a :href="room.credit.profile" target="_blank" rel="noopener noreferrer">
                {{ room.credit.who }}
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h3>Colophon</h3>
          <p>
            Vue and Vite, no backend, no database, no accounts. The artwork is SVG all the way
            through — what you see on screen is the same document that leaves in the export.
          </p>
          <p class="sign">
            <JhMonogram aria-hidden="true" />
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

dl {
  margin: 0 0 0.7rem;
}

dt {
  margin-top: 0.8rem;
  font-size: 0.85rem;
  font-weight: 600;
}

dd {
  margin: 0.2rem 0 0;
  font-size: 0.86rem;
  line-height: 1.6;
  color: var(--ink-dim);
}

strong {
  color: var(--ink);
  font-weight: 600;
}

/* Room on the left, photographer on the right, with the gap between them
   doing the joining — a list of pairs rather than a paragraph of commas. */
.credits {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.84rem;
}

.credits li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.32rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--panel-edge) 55%, transparent);
  color: var(--ink-dim);
}

.credits li:last-child {
  border-bottom: 0;
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
  gap: 0.7rem;
  margin-top: 1rem;
}

.sign :deep(.monogram) {
  width: auto;
  height: 1.9rem;
  flex: none;
}
</style>
