<script setup>
import { computed, useTemplateRef } from 'vue'
import SvgNode from './SvgNode.vue'

/**
 * Dumb renderer for a scene description.
 *
 * Shapes are `{ tag, attrs, children }` where attrs are SVG attributes
 * verbatim, so a generator can emit any SVG element — including groups and
 * clip paths — without this component growing a branch for it. Everything
 * here stays real DOM: inspectable in devtools and serialisable straight out
 * as vector.
 */
const props = defineProps({
  scene: { type: Object, required: true },
  /** Nodes drawn over the finished piece — grain, vignette. */
  overlay: { type: Array, default: () => [] },
  /** Filter and gradient definitions the above refer to. */
  defs: { type: Array, default: () => [] },
  /**
   * Filter applied to the artwork group. Deliberately not to the background
   * rect: channel-splitting a filled background would wreck the paper.
   */
  artworkFilter: { type: String, default: '' },
})

const svg = useTemplateRef('svg')

const viewBox = computed(() => `0 0 ${props.scene.width} ${props.scene.height}`)

defineExpose({ svg })
</script>

<template>
  <svg
    ref="svg"
    class="stage"
    xmlns="http://www.w3.org/2000/svg"
    :viewBox="viewBox"
    :style="{ aspectRatio: `${scene.width} / ${scene.height}` }"
    preserveAspectRatio="xMidYMid meet"
    shape-rendering="geometricPrecision"
  >
    <rect
      x="0"
      y="0"
      :width="scene.width"
      :height="scene.height"
      :fill="scene.background"
    />
    <SvgNode v-for="(node, i) in defs" :key="`defs-${i}`" :node="node" />

    <g :filter="artworkFilter ? `url(#${artworkFilter})` : undefined">
      <SvgNode v-for="(shape, i) in scene.shapes" :key="i" :node="shape" />
    </g>
    <SvgNode v-for="(node, i) in overlay" :key="`overlay-${i}`" :node="node" />
  </svg>
</template>

<style scoped>
/**
 * Colour changes ease rather than cut — palette switches, background swaps,
 * muting an ink, rotating the order.
 *
 * fill and stroke are presentation attributes, which act as low-priority CSS
 * declarations, so changing them triggers a transition like any other property.
 *
 * Deliberately not stroke-width or geometry: those are modulated every frame
 * during showcase, and easing them would lag the motion rather than smooth it.
 * Neither is compositor-accelerated, so this repaints affected elements for the
 * duration — watch the fps readout on the heavier pieces.
 */
.stage :is(path, rect, circle, polygon, line, g) {
  transition:
    fill 600ms ease,
    stroke 600ms ease,
    fill-opacity 600ms ease,
    stroke-opacity 600ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .stage :is(path, rect, circle, polygon, line, g) {
    transition: none;
  }
}

.stage {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: 100%;
  box-shadow: 0 1px 24px rgb(0 0 0 / 55%);
}
</style>
