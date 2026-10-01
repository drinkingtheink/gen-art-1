<script setup>
import { onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import GenArtMark from './GenArtMark.vue'
import ButtonIcon from './ButtonIcon.vue'
import RoomPlate from './RoomPlate.vue'
import { DEFAULT_FRAME, frameById, frames, rooms } from '../core/mounts.js'
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
      <!-- Title, frames and the two actions ride together. Pinning the title
           row alone would slide the frame buttons under it, and the frames are
           wanted exactly when you are far down the page looking at one room and
           want to see it in a different surround. -->
      <div class="bar">
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
                 "Link copied" at 100px, and the whole lockup jumped 29px at the
                 moment of being clicked. A measured min-width would do the same
                 job until someone edits a label and doesn't re-measure. -->
            <span class="swap">
              <span :class="{ gone: copied }">Share this gallery</span>
              <span :class="{ gone: !copied }">Link copied</span>
            </span>
          </button>
        </div>
      </div>

      <ul class="rooms">
        <li v-for="room in rooms" :key="room.id">
          <RoomPlate v-if="framed" :room="room" :framed="framed" :scene="scene" />
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
  /* No padding at the top, and the sheet carries that space as a margin
     instead. A sticky child measures `top` from this box's content edge, so
     padding here held the bar 2rem down the screen and left a strip above it
     that the rooms scrolled through. As a margin the same gap is still there
     at rest and the bar can reach the top edge once it is scrolled to. */
  padding: 0 1rem 3rem;
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
  margin: 2rem auto 0;
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
/**
 * The top of the panel, kept in reach.
 *
 * The rooms are tall photographs and there are three of them, so the way out
 * and the way to share used to be a long scroll back up. This rides with the
 * page instead.
 *
 * It sticks against `.gallery`, which is the scrolling box, and stops at the
 * bottom of `.sheet`, which is its parent — so it travels the length of the
 * panel and no further.
 */
.bar {
  position: sticky;
  top: 0;
  /* Over the rooms, which pass underneath. */
  z-index: 3;
  /* Out to the sheet's edges rather than stopping at its padding, so what
     scrolls under is covered the whole way across. The negative top margin
     cancels the sheet's own top padding, which this now supplies itself. */
  margin: -1.4rem -1.5rem 0;
  padding: 1.4rem 1.5rem 1.2rem;
  /* Opaque, because the artwork travels under it and a 74%-of-panel bar would
     show it through. Mixing toward --bg rather than toward transparent is what
     keeps it matching the sheet: the two are eight values apart per channel
     (#1e1e24 against #16161a), so the opaque mix lands within a shade of what
     the translucent sheet already renders as. */
  background: color-mix(in srgb, var(--panel) 74%, var(--bg));
  /* The sheet's own corners, less the 1px border this sits inside. */
  border-radius: 15px 15px 0 0;
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
  /* Bottom spacing moved to the bar's padding. Left here it would collapse
     through and become a gap below the opaque background, which the rooms
     would scroll through. */
  margin: 1.1rem 0 0;
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
