<script setup>
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { artWindow, hangStyle, matrix3dFor, placeInRoom, placeOnPlane } from '../core/mounts.js'

/**
 * One photograph with the piece hung in it.
 *
 * Its own component rather than markup in the gallery because the same room is
 * shown at two sizes at once the moment one of them is enlarged — the grid
 * behind and the enlarged plate in front — and an angled wall's placement is a
 * homography, which CSS can only express in pixels. A width measured per
 * instance keeps those two honest; a single map keyed by room would hand both
 * plates whichever width was written last.
 */

const props = defineProps({
  room: { type: Object, required: true },
  /** `{ url, box }` — the framed piece, composed once and shared by every room. */
  framed: { type: Object, required: true },
  scene: { type: Object, required: true },
})

const width = ref(0)
const el = useTemplateRef('el')
let observer = null

onMounted(() => {
  if (!el.value) return
  // Measured once up front, because a ResizeObserver is not guaranteed to
  // deliver anything: it is throttled with the rest of rendering in a hidden
  // or background tab, and an angled room draws no piece at all until it has a
  // width. Reading the box here costs one layout and means the first paint is
  // right whether or not the observer ever gets a turn.
  width.value = el.value.getBoundingClientRect().width

  // The observer is then only for changes — a plate resizes when the grid
  // reflows, which the window size alone does not predict.
  observer = new ResizeObserver(([entry]) => {
    width.value = entry.contentRect.width
  })
  observer.observe(el.value)
})

onUnmounted(() => observer?.disconnect())

/**
 * Placement and lighting together, in one pass.
 *
 * They share the quad, and on an angled wall that quad is also what sets the
 * boost — the piece is drawn at its own size and transformed down, so every
 * length inside it shrinks and the shadows have to be grown to match.
 */
const hung = computed(() => {
  const { room, framed, scene } = props
  if (!framed) return null

  if (!room.plane) {
    const p = placeInRoom(room, framed.box.width, framed.box.height)
    const light = hangStyle(room)
    return {
      light,
      style: {
        left: `${p.left * 100}%`,
        top: `${p.top * 100}%`,
        width: `${p.width * 100}%`,
        height: `${p.height * 100}%`,
        boxShadow: light.shadow,
      },
      print: { ...artWindow(framed.box, scene), boxShadow: light.recess },
    }
  }

  if (!width.value) return null
  const height = (width.value * room.height) / room.width
  const quad = placeOnPlane(room, framed.box.width, framed.box.height).map(([x, y]) => [
    x * width.value,
    y * height,
  ])
  const light = hangStyle(room, framed.box.width / (quad[1][0] - quad[0][0]))

  return {
    light,
    style: {
      left: '0',
      top: '0',
      width: `${framed.box.width}px`,
      height: `${framed.box.height}px`,
      transformOrigin: '0 0',
      transform: matrix3dFor(quad, framed.box.width, framed.box.height),
      boxShadow: light.shadow,
    },
    print: { ...artWindow(framed.box, scene), boxShadow: light.recess },
  }
})
</script>

<template>
  <div ref="el" class="room">
    <img class="plate" :src="room.src" alt="" />
    <!-- A shadow on the wall, the room reflected in the glass, and a breath of
         the wall's own colour over the work. The piece is isolated so those
         blend with the artwork and not with the photograph underneath it. -->
    <div v-if="hung" class="hung" :style="hung.style">
      <img :src="framed.url" alt="" />
      <!-- On the print rather than around it: the mat's inner edge shadowing
           the paper that sits a few millimetres behind it. -->
      <span class="print" :style="hung.print" />
      <!-- The room coming back out of the glazing. Over the artwork, because
           that is where a reflection falls and where a piece otherwise reads
           as pasted on rather than framed. -->
      <span class="glaze" :style="{ backgroundImage: hung.light.glaze }" />
      <span class="glass" :style="{ backgroundImage: hung.light.sheen }" />
      <span class="cast" :style="{ backgroundColor: hung.light.wall }" />
      <!-- Last, and over everything: the lit edge of the moulding. A frame
           with no edge catching the light reads as a printed rectangle however
           well it is placed. -->
      <span class="edge" :style="{ boxShadow: hung.light.edge }" />
    </div>
  </div>
</template>

<style scoped>
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

.plate {
  display: block;
  width: 100%;
  height: auto;
}

/* Flat rooms are placed as a fraction of the photograph, so they hold at any
   displayed size; an angled room is placed at 0,0 and moved by its matrix. */
.hung {
  position: absolute;
  /* Its own stacking context, so the sheen and the colour cast fall on the
     artwork rather than on the room behind it. */
  isolation: isolate;
}

.hung img {
  display: block;
  width: 100%;
  height: 100%;
}

.hung span {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hung .cast {
  opacity: 0.07;
  mix-blend-mode: soft-light;
}

/* Nothing of their own — they are only the shadows they carry. */
.hung .edge,
.hung .print {
  background: none;
}

/* The one layer not covering the whole mounted object: it is placed on the
   print, so it must drop the `inset: 0` the others rely on. */
.hung .print {
  inset: auto;
}
</style>
