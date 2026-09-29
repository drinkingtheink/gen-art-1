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

// 16:9 regardless of the window: the SVG is scaled to cover, so the viewBox
// only needs to be roughly the shape of a screen.
const WIDTH = 1600
const HEIGHT = 900

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
    width: WIDTH,
    height: HEIGHT,
    palette,
  })

// shallowRef because a scene is a large plain tree that is replaced wholesale
// every frame; making its thousands of nodes deeply reactive would cost more
// than generating it.
const scene = shallowRef(build(0))

let frame = 0
let start = 0

function tick(now) {
  if (!start) start = now
  scene.value = build(((now - start) / 1000) * RATE)
  frame = requestAnimationFrame(tick)
}

onMounted(() => {
  if (!still) frame = requestAnimationFrame(tick)
})

onUnmounted(() => cancelAnimationFrame(frame))

const viewBox = `0 0 ${WIDTH} ${HEIGHT}`
</script>

<template>
  <div class="backdrop" aria-hidden="true">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid slice"
      shape-rendering="optimizeSpeed"
    >
      <rect x="0" y="0" :width="WIDTH" :height="HEIGHT" :fill="scene.background" />
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
