<script setup>
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import {
  artWindow,
  beamOver,
  hangStyle,
  matrix3dFor,
  PLATE_ASPECT,
  placeInRoom,
  placeOnPlane,
  wallTone,
} from '../core/mounts.js'

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
const photo = useTemplateRef('photo')
let observer = null

/**
 * Whether the photograph has arrived.
 *
 * Not for the layout — the room's size is declared on the `<img>` so the box
 * is the right shape before a byte is fetched — but for what goes inside it.
 * The piece is a blob URL and paints almost immediately, where the photograph
 * is a few hundred kilobytes over the wire, so without this the work appears
 * first, hanging in an empty rectangle, and the room arrives underneath it.
 */
const arrived = ref(false)

onMounted(() => {
  // A cached photograph can finish before Vue has bound the load handler, in
  // which case the event has already been and gone and nothing would ever
  // reveal the plate. Asking the element settles it either way.
  if (photo.value?.complete) arrived.value = true

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

watch(
  () => props.room.src,
  () => {
    arrived.value = photo.value?.complete ?? false
  },
)

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
    // The beam is measured in the photograph's pixels, so the piece has to be
    // handed over in those too — not the container's.
    const flat = [
      [p.left, p.top],
      [p.left + p.width, p.top],
      [p.left + p.width, p.top + p.height],
      [p.left, p.top + p.height],
    ].map(([x, y]) => [x * room.width, y * room.height])
    return {
      light,
      beam: beamOver(room, flat, framed.box.width, framed.box.height),
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
  const onPhoto = placeOnPlane(room, framed.box.width, framed.box.height).map(([x, y]) => [
    x * room.width,
    y * room.height,
  ])

  return {
    light,
    beam: beamOver(room, onPhoto, framed.box.width, framed.box.height),
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
  <!-- The window. Every room is shown in the same shape, so a plate is cropped
       to it rather than taking whatever proportions its photograph happened to
       be shot in. -->
  <div
    ref="el"
    class="room"
    :style="{ backgroundColor: wallTone(room), aspectRatio: PLATE_ASPECT }"
  >
    <!-- The photograph, whole, behind that window. The piece is placed as a
         fraction of the *photograph*, so it has to stay inside a box that is
         still the photograph's own shape — crop the box the piece is measured
         against and every placement moves with it. -->
    <div class="photo" :style="{ aspectRatio: room.width / room.height }">
      <!-- `width` and `height` are the photograph's own pixels, which is what
           lets the browser reserve the right box before the file arrives.
           Without them the container has no height until the image decodes,
           every cell in the grid is flat, and the panel jumps when they land. -->
      <img
        ref="photo"
        class="plate"
        :class="{ arrived }"
        :src="room.src"
        :width="room.width"
        :height="room.height"
        alt=""
        decoding="async"
        @load="arrived = true"
        @error="arrived = true"
      />
      <!-- A shadow on the wall, the room reflected in the glass, and a breath of
           the wall's own colour over the work. The piece is isolated so those
           blend with the artwork and not with the photograph underneath it. -->
      <div v-if="hung" class="hung" :class="{ arrived }" :style="hung.style">
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
        <!-- The room's own sunbeam, carried across the work. Drawn in the
             piece's flat coordinates and transformed with it, which is what
             puts it at the wall's angle rather than the screen's. -->
        <span v-if="hung.beam" class="beam" :style="{ backgroundImage: hung.beam }" />
        <!-- Last, and over everything: the lit edge of the moulding. A frame
             with no edge catching the light reads as a printed rectangle however
             well it is placed. -->
        <span class="edge" :style="{ boxShadow: hung.light.edge }" />
      </div>
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

/**
 * The photograph at its own proportions, centred in the window.
 *
 * Centred rather than pinned to the top: these rooms carry the wall above and
 * the furniture below, and taking the crop off one end only would lose a whole
 * end of the room. The art hangs in the middle third of every one of them, so
 * the middle is what survives.
 */
.photo {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  translate: 0 -50%;
}

.plate {
  display: block;
  width: 100%;
  height: 100%;
}

/**
 * Both fade up once the photograph is there, the work a beat behind the room
 * it hangs in — which is the order the eye wants and costs nothing to give it.
 *
 * The box underneath is already the right shape and already the colour of the
 * wall, so this is the only thing left moving.
 */
.plate,
.hung {
  opacity: 0;
  transition: opacity 420ms ease;
}

.hung {
  transition-delay: 110ms;
}

.plate.arrived,
.hung.arrived {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .plate,
  .hung {
    transition-duration: 1ms;
    transition-delay: 0ms;
  }
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

/* Multiply, because what this layer carries is the shade outside the beam
   rather than the light inside it. The core is white and changes nothing; the
   wall either side is held down to what the photograph measures. */
.hung .beam {
  mix-blend-mode: multiply;
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
