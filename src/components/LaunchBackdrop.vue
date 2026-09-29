<script setup>
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import SvgNode from './SvgNode.vue'
import { backdropPiece } from '../core/launch.js'
import { paramsAt } from '../core/showcase.js'
import { createRng } from '../core/rng.js'
import { getPalette } from '../core/palettes.js'

/**
 * A piece playing behind the opening panel.
 *
 * The panel used to sit on flat colour, which said nothing about what the
 * studio does. A piece actually moving back there does — before reading a
 * word, you have seen the thing work.
 *
 * It is a real piece on a real showcase preset, not a video or a canned loop,
 * so it is different on every visit and costs nothing to ship.
 */

/**
 * The canvas is shaped to the window rather than to a fixed 16:9.
 *
 * Scaling a 16:9 canvas to cover works, but it crops — on a tall window most
 * of the piece is outside the screen, and on a wide one the top and bottom
 * go. Generating at the window's own proportions means the piece is composed
 * for the shape it is actually shown at, edge to edge, with nothing cut off.
 *
 * Area is held constant, the same bargain `ratios.js` makes for the stage, so
 * a grid count or a cell size means the same density whatever the shape of the
 * window — a piece doesn't get coarse just because the window is narrow.
 */
const TARGET_AREA = 1600 * 900

function canvasForWindow() {
  const aspect = Math.max(0.3, Math.min(4, (window.innerWidth || 16) / (window.innerHeight || 9)))
  const width = Math.round(Math.sqrt(TARGET_AREA * aspect))
  return { width, height: Math.round(width / aspect) }
}

const canvas = ref(canvasForWindow())

const piece = backdropPiece()
const palette = getPalette(piece.params.palette)

/**
 * Half speed. This is scenery behind a sheet of glass, and at full preset
 * speed it pulls the eye off the panel it is sitting behind.
 */
const RATE = 0.5

const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const build = (time) =>
  piece.generator.generate({
    params: paramsAt(time, piece.params, piece.modulators, piece.generator.params, 0.85),
    rng: createRng(piece.seed),
    width: canvas.value.width,
    height: canvas.value.height,
    palette,
  })

// shallowRef because a scene is a large plain tree that is replaced wholesale
// every frame; making its thousands of nodes deeply reactive would cost more
// than generating it.
const scene = shallowRef(build(0))

let frame = 0
let start = 0
let elapsed = 0

function tick(now) {
  if (!start) start = now
  elapsed = ((now - start) / 1000) * RATE
  scene.value = build(elapsed)
  frame = requestAnimationFrame(tick)
}

// Reshaping means regenerating, so it waits for the drag to stop rather than
// running once per resize event.
let resizeTimer = 0
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    const next = canvasForWindow()
    if (next.width === canvas.value.width && next.height === canvas.value.height) return
    canvas.value = next
    // A paused backdrop still has to redraw at the new shape.
    if (still) scene.value = build(elapsed)
  }, 180)
}

onMounted(() => {
  if (!still) frame = requestAnimationFrame(tick)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  cancelAnimationFrame(frame)
  clearTimeout(resizeTimer)
  window.removeEventListener('resize', onResize)
})

const viewBox = computed(() => `0 0 ${canvas.value.width} ${canvas.value.height}`)
</script>

<template>
  <div class="backdrop" aria-hidden="true">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid slice"
      shape-rendering="optimizeSpeed"
    >
      <rect x="0" y="0" :width="canvas.width" :height="canvas.height" :fill="scene.background" />
      <SvgNode v-for="(shape, i) in scene.shapes" :key="i" :node="shape" />
    </svg>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  /* Decoration, never a target — the panel above it takes every click. */
  pointer-events: none;
}

.backdrop svg {
  width: 100%;
  height: 100%;
}
</style>
