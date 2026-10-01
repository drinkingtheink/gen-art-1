<script setup>
import { onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import GenArtMark from './GenArtMark.vue'
import { DEFAULT_FRAME, frameById, frames, hangStyle, placeInRoom, rooms } from '../core/mounts.js'
import { renderSvg } from '../core/svg.js'

/**
 * The current piece, standing in a real room.
 *
 * The framed piece is a separate SVG document handed to an `<img>`, which is
 * the opening panel's thumbnail trick and is here for the same reason twice
 * over: a piece mints clip-path and filter ids from its own seed, so two
 * framings of it inlined together would collide, and the stage is left alone,
 * which matters because export serialises the live stage node.
 *
 * The photograph stays a plain `<img>` underneath. It cannot join the SVG: one
 * shown in an `<img>` may not load anything external, so the only way in would
 * be to carry the whole photograph as a data URI.
 */

const props = defineProps({
  scene: { type: Object, required: true },
  defs: { type: Array, default: () => [] },
  artworkFilter: { type: String, default: '' },
  overlay: { type: Array, default: () => [] },
  title: { type: String, default: '' },
})

const emit = defineEmits(['dismiss'])

const frameId = ref(DEFAULT_FRAME)
const framed = ref(null)
let url = null

/**
 * One framed document, reused by every room.
 *
 * The frame is a property of the piece, not of the wall, so changing rooms
 * costs nothing and changing frame costs exactly one render.
 */
function compose() {
  if (url) {
    URL.revokeObjectURL(url)
    url = null
  }
  try {
    const box = frameById[frameId.value].compose(props.scene)
    const markup = renderSvg(props.scene, {
      defs: props.defs,
      artworkFilter: props.artworkFilter,
      overlay: props.overlay,
      frame: box,
    })
    url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }))
    framed.value = {
      url,
      places: Object.fromEntries(
        rooms.map((room) => {
          const p = placeInRoom(room, box.width, box.height)
          return [
            room.id,
            {
              left: `${p.left * 100}%`,
              top: `${p.top * 100}%`,
              width: `${p.width * 100}%`,
              height: `${p.height * 100}%`,
              boxShadow: hangStyle(room).shadow,
            },
          ]
        }),
      ),
    }
  } catch {
    framed.value = null
  }
}

watch(frameId, compose)

const closer = useTemplateRef('closer')
let returnTo = null

function onKey(event) {
  if (event.key === 'Escape') emit('dismiss')
}

onMounted(() => {
  // Where the keyboard was before this opened, so it can be put back.
  returnTo = document.activeElement
  compose()
  window.addEventListener('keydown', onKey)
  closer.value?.focus()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  if (url) URL.revokeObjectURL(url)
  if (returnTo?.isConnected) returnTo.focus()
})
</script>

<template>
  <div class="gallery" role="dialog" aria-modal="true" aria-labelledby="gallery-title">
    <div class="sheet">
      <header class="head">
        <div>
          <h2 id="gallery-title">On the wall</h2>
          <p class="who">{{ title }}</p>
        </div>
        <!-- Decorative: the heading beside it already names the panel, and
             this is the one surface in the app showing the work off rather
             than operating on it. -->
        <p class="crest" aria-hidden="true"><GenArtMark /></p>
        <button ref="closer" type="button" @click="emit('dismiss')">Close</button>
      </header>

      <div class="frames" role="group" aria-label="Frame">
        <button
          v-for="f in frames"
          :key="f.id"
          type="button"
          :class="{ on: f.id === frameId }"
          :aria-pressed="f.id === frameId"
          @click="frameId = f.id"
        >
          {{ f.name }}
        </button>
      </div>

      <ul class="rooms">
        <li v-for="room in rooms" :key="room.id">
          <div class="room">
            <img class="plate" :src="room.src" alt="" />
            <!-- A shadow on the wall, a sheen on the glass, and a breath of
                 the room's own colour over the work. The piece is isolated so
                 those last two blend with the artwork and not with the
                 photograph underneath it. -->
            <div v-if="framed" class="hung" :style="framed.places[room.id]">
              <img :src="framed.url" alt="" />
              <span class="glass" :style="{ backgroundImage: hangStyle(room).sheen }" />
              <span class="cast" :style="{ backgroundColor: hangStyle(room).wall }" />
              <!-- Last, and over everything: the lit edge of the moulding. A
                   frame with no edge catching the light reads as a printed
                   rectangle however well it is placed. -->
              <span class="edge" :style="{ boxShadow: hangStyle(room).edge }" />
            </div>
          </div>
          <p class="credit">
            {{ room.name }} — photo by
            <a :href="room.credit.profile" target="_blank" rel="noopener noreferrer">{{ room.credit.who }}</a>
            on
            <a :href="room.credit.sourceUrl" target="_blank" rel="noopener noreferrer">{{ room.credit.source }}</a>
          </p>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/**
 * Opening and closing.
 *
 * The transition classes land on this component's root, which is the frosted
 * backdrop, so the two halves can be timed differently: the frost fades, and
 * the sheet rises into it. Weighting it that way is what makes the panel read
 * as arriving over the studio rather than as a box being switched on.
 *
 * Out is faster than in — 180ms against 260 — because a dismissal has already
 * been decided and an exit that takes as long as an entrance feels like the
 * app arguing. The easing is the same curve the opening panel's cards use.
 *
 * `backdrop-filter` is deliberately not animated: blur is the single most
 * expensive thing on this screen, and interpolating it drops frames on the
 * whole composite. Opacity on the frosted layer does the same work for free.
 */
.gallery-enter-active {
  transition: opacity 260ms cubic-bezier(0.2, 0.7, 0.3, 1);
}

.gallery-leave-active {
  transition: opacity 180ms cubic-bezier(0.4, 0, 0.6, 1);
  /* On the way out it is still a full-screen layer for 180ms. Without this it
     would swallow the first click aimed at whatever it is uncovering. */
  pointer-events: none;
}

.gallery-enter-from,
.gallery-leave-to {
  opacity: 0;
}

.gallery-enter-active .sheet {
  transition: transform 260ms cubic-bezier(0.2, 0.7, 0.3, 1);
}

.gallery-leave-active .sheet {
  transition: transform 180ms cubic-bezier(0.4, 0, 0.6, 1);
}

.gallery-enter-from .sheet,
.gallery-leave-to .sheet {
  transform: translateY(14px) scale(0.985);
}

@media (prefers-reduced-motion: reduce) {
  .gallery-enter-active,
  .gallery-leave-active,
  .gallery-enter-active .sheet,
  .gallery-leave-active .sheet {
    transition-duration: 1ms;
  }

  .gallery-enter-from .sheet,
  .gallery-leave-to .sheet {
    transform: none;
  }
}

.gallery {
  position: fixed;
  inset: 0;
  z-index: 12;
  overflow-y: auto;
  padding: 2rem 1rem 3rem;
  background: transparent;
}

/* The frost, with the explicit z-index the opening panel's comment explains:
   a ::before is its element's first child, so at an equal z-index the sheet
   would paint under it. */
.gallery::before {
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
  max-width: 920px;
  margin: 0 auto;
  padding: 1.4rem 1.5rem 1.8rem;
  border: 1px solid color-mix(in srgb, var(--panel-edge) 80%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--panel) 74%, transparent);
  box-shadow: 0 24px 60px rgb(0 0 0 / 45%);
}

/**
 * Title, mark, Close — on one line, with the mark centred on the sheet rather
 * than on the space left between the other two. That is what the outer columns
 * are for: equal and flexible either side, so an eight-word title or a
 * forty-word one moves the mark not at all.
 *
 * Sized by font-size rather than height: the mark measures itself in em, so
 * one number sets it wherever it appears and nothing has to reach past the
 * component's own rule.
 */
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
   centred it has nothing to stand beside, and that margin is what put it three
   pixels off centre. */
.crest svg {
  margin: 0;
}

.head > button {
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

.frames {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 1.1rem 0 1.2rem;
}

.frames button {
  font-size: 0.8rem;
}

.frames button.on {
  color: var(--accent-ink);
  background: var(--accent);
  border-color: var(--accent-edge);
}

.frames button.on:hover {
  background: var(--accent-hot);
}

.rooms {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.2rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.room {
  position: relative;
  /* The piece is placed as a percentage, so its shadow is measured against the
     photograph's width too — in pixels it would be right at exactly one size. */
  container-type: inline-size;
  border: 1px solid var(--panel-edge);
  border-radius: var(--radius);
  overflow: hidden;
  line-height: 0;
}

.room .plate {
  display: block;
  width: 100%;
  height: auto;
}

/* Placed as a fraction of the photograph, so it holds at any displayed size. */
.room .hung {
  position: absolute;
  /* Its own stacking context, so the sheen and the colour cast fall on the
     artwork rather than on the room behind it. */
  isolation: isolate;
}

.room .hung img {
  display: block;
  width: 100%;
  height: 100%;
}

.room .hung span {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.room .hung .cast {
  opacity: 0.07;
  mix-blend-mode: soft-light;
}

/* Nothing of its own — it is only the inset shadow it carries. */
.room .hung .edge {
  background: none;
}

.credit {
  margin: 0.5rem 0 0;
  color: var(--ink-dim);
  font-size: 0.72rem;
  line-height: 1.4;
}

.credit a {
  color: var(--ink-dim);
  text-decoration: underline;
}

.credit a:hover {
  color: var(--accent);
}
</style>
