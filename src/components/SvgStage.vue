<script setup>
import { computed, useTemplateRef } from 'vue'

/**
 * Dumb renderer for a scene description.
 *
 * Shapes are `{ tag, attrs }` where attrs are SVG attributes verbatim, so a
 * generator can emit any SVG element without this component growing a branch
 * for it. Everything here stays real DOM: inspectable in devtools and
 * serialisable straight out as vector.
 */
const props = defineProps({
  scene: { type: Object, required: true },
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
    <component
      v-for="(shape, i) in scene.shapes"
      :is="shape.tag"
      :key="i"
      v-bind="shape.attrs"
    />
  </svg>
</template>

<style scoped>
.stage {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: 100%;
  box-shadow: 0 1px 24px rgb(0 0 0 / 55%);
}
</style>
