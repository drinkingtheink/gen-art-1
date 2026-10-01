<script setup>
import { onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import GenArtMark from './GenArtMark.vue'
import ButtonIcon from './ButtonIcon.vue'
import {
  DEFAULT_FRAME,
  frameById,
  frames,
  artWindow,
  hangStyle,
  matrix3dFor,
  placeInRoom,
  placeOnPlane,
  rooms,
} from '../core/mounts.js'
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
  /**
   * The frame, owned by the app rather than by this panel.
   *
   * It used to be local state, which made the gallery unshareable: being on
   * the wall, and which frame the work hung in, existed only for as long as
   * the component did. Both live in the URL now, so a link can carry them.
   */
  frame: { type: String, default: DEFAULT_FRAME },
  copied: { type: Boolean, default: false },
})

const emit = defineEmits(['dismiss', 'frame', 'copy'])

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
    const box = (frameById[props.frame] ?? frameById[DEFAULT_FRAME]).compose(props.scene)
    const markup = renderSvg(props.scene, {
      defs: props.defs,
      artworkFilter: props.artworkFilter,
      overlay: props.overlay,
      frame: box,
    })
    url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }))
    framed.value = { url, box }
  } catch {
    framed.value = null
  }
}

watch(() => props.frame, compose)

/**
 * Rendered width per room, for the angled wall's pixel maths.
 *
 * An observer rather than a window listener: this grid reflows at widths the
 * window size alone does not predict.
 */
const widths = ref({})
const list = useTemplateRef('list')
let observer = null

/**
 * Where the piece sits in one room.
 *
 * A flat wall is a scale and a translate, so the piece is placed in
 * percentages and holds at any displayed size without measuring anything. An
 * angled wall is a homography, which CSS can only express in pixels — so that
 * case, and only that case, needs the room's rendered width.
 */
function hungStyle(room) {
  const f = framed.value
  if (!f) return null

  if (!room.plane) {
    const p = placeInRoom(room, f.box.width, f.box.height)
    return {
      left: `${p.left * 100}%`,
      top: `${p.top * 100}%`,
      width: `${p.width * 100}%`,
      height: `${p.height * 100}%`,
      boxShadow: lighting(room).shadow,
    }
  }

  const cw = widths.value[room.id]
  if (!cw) return null
  const ch = (cw * room.height) / room.width
  const quad = placeOnPlane(room, f.box.width, f.box.height).map(([x, y]) => [x * cw, y * ch])

  return {
    left: '0',
    top: '0',
    width: `${f.box.width}px`,
    height: `${f.box.height}px`,
    transformOrigin: '0 0',
    transform: matrix3dFor(quad, f.box.width, f.box.height),
    boxShadow: lighting(room).shadow,
  }
}

/**
 * The room's light, as every layer wants it.
 *
 * One call rather than one per layer, because an angled wall needs the boost
 * — its piece is drawn at full size and transformed down, so lengths inside it
 * shrink — and before this only the shadow was getting it.
 */
function lighting(room) {
  const f = framed.value
  if (!room.plane || !f) return hangStyle(room)

  const cw = widths.value[room.id]
  if (!cw) return hangStyle(room)
  const ch = (cw * room.height) / room.width
  const quad = placeOnPlane(room, f.box.width, f.box.height).map(([x, y]) => [x * cw, y * ch])
  return hangStyle(room, f.box.width / (quad[1][0] - quad[0][0]))
}

/** The print's own rectangle, for the treatments that belong on it. */
function printStyle(room) {
  return { ...artWindow(framed.value.box, props.scene), boxShadow: lighting(room).recess }
}

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

  observer = new ResizeObserver((entries) => {
    const next = { ...widths.value }
    for (const entry of entries) next[entry.target.dataset.room] = entry.contentRect.width
    widths.value = next
  })
  for (const el of list.value?.querySelectorAll('[data-room]') ?? []) observer.observe(el)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  observer?.disconnect()
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
        <!-- Not "Close": this panel is a room you are standing in, and the app's
             own word for what is behind it is the studio — the launch panel
             offers to "just open the studio" and this file's transition note
             describes the sheet as arriving over it. Naming the destination
             rather than the gesture keeps the gallery/studio pair intact. -->
        <button ref="closer" type="button" class="leave" @click="emit('dismiss')">
          <ButtonIcon glyph="back" />
          Back to the studio
        </button>
      </header>

      <div class="choices">
        <div class="frames" role="group" aria-label="Frame">
          <button
            v-for="f in frames"
            :key="f.id"
            type="button"
            :class="{ on: f.id === frame }"
            :aria-pressed="f.id === frame"
            @click="emit('frame', f.id)"
          >
            {{ f.name }}
          </button>
        </div>

        <!-- The sidebar's own copy button is behind this panel and out of
             reach, and the link it would hand over is a different link: this
             one carries `w`, so it opens here rather than in the studio. -->
        <button type="button" class="share" @click="emit('copy')">
          <ButtonIcon :glyph="copied ? 'tick' : 'link'" />
          <!-- Both labels sit in one grid cell, so the button is always as
               wide as the longer of them and copying doesn't resize it. It is
               right-aligned on this row, so the width it loses comes off its
               left edge: measured, "Share this gallery" is 131px against
               "Link Copied" at 101px, and the whole lockup jumped 29px at the
               moment of being clicked. A measured min-width would do the same
               job until someone edits a label and doesn't re-measure. -->
          <span class="swap">
            <span :class="{ gone: copied }">Share this gallery</span>
            <span :class="{ gone: !copied }">Link Copied</span>
          </span>
        </button>
      </div>

      <ul ref="list" class="rooms">
        <li v-for="room in rooms" :key="room.id">
          <div class="room" :data-room="room.id">
            <img class="plate" :src="room.src" alt="" />
            <!-- A shadow on the wall, the room reflected in the glass, and a
                 breath of the wall's own colour over the work. The piece is
                 isolated so those blend with the artwork and not with the
                 photograph underneath it. -->
            <div v-if="hungStyle(room)" class="hung" :style="hungStyle(room)">
              <img :src="framed.url" alt="" />
              <!-- On the print rather than around it: the mat's inner edge
                   shadowing the paper that sits a few millimetres behind it. -->
              <span class="print" :style="printStyle(room)" />
              <!-- The room coming back out of the glazing. Over the artwork,
                   because that is where a reflection falls and where a piece
                   otherwise reads as pasted on rather than framed. -->
              <span class="glaze" :style="{ backgroundImage: lighting(room).glaze }" />
              <span class="glass" :style="{ backgroundImage: lighting(room).sheen }" />
              <span class="cast" :style="{ backgroundColor: lighting(room).wall }" />
              <!-- Last, and over everything: the lit edge of the moulding. A
                   frame with no edge catching the light reads as a printed
                   rectangle however well it is placed. -->
              <span class="edge" :style="{ boxShadow: lighting(room).edge }" />
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

/* The same lockup the share button uses — icon, a gap in em, label — because
   the point of giving both an icon is that they look like one kind of thing. */
.leave {
  display: flex;
  align-items: center;
  gap: 0.45em;
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

/* Frames left, share right, and allowed to stack rather than squeeze — at
   narrow widths the four frame buttons already wrap, and a share button
   crushed onto the end of that reads as a fifth frame. */
.choices {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin: 1.1rem 0 1.2rem;
}

.frames {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.share {
  display: flex;
  align-items: center;
  gap: 0.45em;
  font-size: 0.8rem;
}

.swap {
  display: grid;
  /* The shorter label centres in the space the longer one claims, rather than
     sitting left with the slack trailing after it. */
  justify-items: center;
}

/* Stacked, not side by side. */
.swap > span {
  grid-area: 1 / 1;
}

/* visibility, not display: the hidden label has to keep holding the cell open,
   and this takes it out of the accessibility tree as display would. */
.swap .gone {
  visibility: hidden;
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

/* Nothing of their own — they are only the shadows they carry. */
.room .hung .edge,
.room .hung .print {
  background: none;
}

/* The one layer not covering the whole mounted object: it is placed on the
   print, so it must drop the `inset: 0` the others rely on. */
.room .hung .print {
  inset: auto;
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
