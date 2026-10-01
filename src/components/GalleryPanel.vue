<script setup>
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { mounts, placeInPhoto } from '../core/mounts.js'
import { renderSvg } from '../core/svg.js'

/**
 * The current piece, presented several ways at once.
 *
 * Every cell is a separate SVG document handed to an `<img>` — the same choice
 * the opening panel makes for its thumbnails, and for the same reason twice
 * over. A piece mints clip-path and filter ids from its own seed, so five
 * presentations of one piece inlined together would be five collisions by
 * construction; and the stage is left completely alone, which matters because
 * export serialises the live stage node and would otherwise pick up whatever
 * chrome a gallery had added to it.
 */

const props = defineProps({
  scene: { type: Object, required: true },
  defs: { type: Array, default: () => [] },
  artworkFilter: { type: String, default: '' },
  overlay: { type: Array, default: () => [] },
  title: { type: String, default: '' },
})

const emit = defineEmits(['dismiss'])

const cells = ref([])
const urls = []
let frame = 0
let stopped = false

/**
 * One cell per animation frame, as the opening panel does.
 *
 * Composing five documents of a heavy piece in one pass is long enough to show
 * as a stall; a frame apart, the browser paints between them and the gallery
 * fills in visibly instead.
 */
function build(index) {
  if (stopped || index >= mounts.length) return
  const mount = mounts[index]
  try {
    const composed = mount.compose(props.scene)
    const markup = renderSvg(props.scene, {
      defs: props.defs,
      artworkFilter: props.artworkFilter,
      overlay: props.overlay,
      frame: composed,
    })
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }))
    urls.push(url)

    const cell = { mount, url, aspect: `${composed.width} / ${composed.height}` }
    if (mount.kind === 'photo') {
      const place = placeInPhoto(mount.photo, composed.width, composed.height)
      cell.place = {
        left: `${place.left * 100}%`,
        top: `${place.top * 100}%`,
        width: `${place.width * 100}%`,
        height: `${place.height * 100}%`,
      }
    }
    cells.value = [...cells.value, cell]
  } catch {
    // One mount failing is a missing cell, not a dead gallery.
  }
  frame = requestAnimationFrame(() => build(index + 1))
}

const closer = useTemplateRef('closer')
let returnTo = null

function onKey(event) {
  if (event.key === 'Escape') emit('dismiss')
}

onMounted(() => {
  // Where the keyboard was before this opened, so it can be put back.
  returnTo = document.activeElement
  build(0)
  window.addEventListener('keydown', onKey)
  closer.value?.focus()
})

onUnmounted(() => {
  stopped = true
  cancelAnimationFrame(frame)
  window.removeEventListener('keydown', onKey)
  for (const url of urls) URL.revokeObjectURL(url)
  // Returning focus is the half the opening panel leaves out; without it the
  // keyboard lands back at the top of the document.
  if (returnTo?.isConnected) returnTo.focus()
})
</script>

<template>
  <div class="gallery" role="dialog" aria-modal="true" aria-labelledby="gallery-title">
    <div class="sheet">
      <header class="head">
        <div>
          <h2 id="gallery-title">Preview</h2>
          <p class="who">{{ title }}</p>
        </div>
        <button ref="closer" type="button" class="close" @click="emit('dismiss')">Close</button>
      </header>

      <ul class="grid">
        <li v-for="cell in cells" :key="cell.mount.id" :class="{ wide: cell.mount.kind !== 'photo' }">
          <!-- A photograph is a real place the work is standing in, so the
               artwork is laid over it rather than inlined into it: an SVG in an
               `<img>` may not load anything external, and the only way in would
               be to carry the whole photograph as a data URI per cell. -->
          <div v-if="cell.mount.kind === 'photo'" class="room">
            <img class="plate" :src="cell.mount.photo.src" alt="" />
            <img class="hung" :src="cell.url" :style="cell.place" alt="" />
          </div>
          <div v-else class="flat" :style="{ aspectRatio: cell.aspect }">
            <img :src="cell.url" alt="" />
          </div>

          <div class="caption">
            <span class="name">{{ cell.mount.name }}</span>
            <span class="note">{{ cell.mount.note }}</span>
            <!-- Attribution travels with the photograph, not with the page. -->
            <span v-if="cell.mount.credit" class="credit">
              Photo by
              <a :href="cell.mount.credit.profile" target="_blank" rel="noopener noreferrer">{{ cell.mount.credit.who }}</a>
              on
              <a :href="cell.mount.credit.sourceUrl" target="_blank" rel="noopener noreferrer">{{ cell.mount.credit.source }}</a>
            </span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.gallery {
  position: fixed;
  inset: 0;
  z-index: 12;
  overflow-y: auto;
  padding: 2rem 1rem 3rem;
  background: transparent;
}

/* The same frost the opening panel uses, and the same reason for the explicit
   z-index: a ::before is its element's first child, so at an equal z-index the
   sheet would paint under it. */
.gallery::before {
  position: fixed;
  inset: 0;
  z-index: 1;
  background: color-mix(in srgb, var(--bg) 78%, transparent);
  backdrop-filter: blur(13px) saturate(1.2);
  -webkit-backdrop-filter: blur(13px) saturate(1.2);
  content: '';
  pointer-events: none;
}

.sheet {
  position: relative;
  z-index: 2;
  max-width: 1180px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 2rem;
  border: 1px solid color-mix(in srgb, var(--panel-edge) 80%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--panel) 74%, transparent);
  box-shadow: 0 24px 60px rgb(0 0 0 / 45%);
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.3rem;
}

h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.who {
  margin: 0.2rem 0 0;
  color: var(--ink-dim);
  font-size: 0.8rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 1.1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* A room shot is portrait and wants the height; a flat mount does not. */
.grid li.wide {
  grid-row: span 1;
}

.flat {
  display: grid;
  place-items: center;
  background: #101015;
  border: 1px solid var(--panel-edge);
  border-radius: var(--radius);
  overflow: hidden;
}

.flat img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.room {
  position: relative;
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

/* Positioned as a fraction of the photograph, so it holds at any cell size. */
.room .hung {
  position: absolute;
  object-fit: contain;
}

.caption {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.5rem 0.1rem 0;
}

.name {
  font-size: 0.82rem;
  font-weight: 600;
}

.note,
.credit {
  color: var(--ink-dim);
  font-size: 0.72rem;
  line-height: 1.35;
}

.credit a {
  color: var(--ink-dim);
  text-decoration: underline;
}

.credit a:hover {
  color: var(--accent);
}
</style>
