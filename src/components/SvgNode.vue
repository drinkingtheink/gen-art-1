<script setup>
/**
 * One node of a scene, rendered recursively.
 *
 * `{ tag, attrs, children }` maps straight onto SVG, so a generator can nest
 * groups, clip paths or gradients without the renderer knowing what any of
 * them mean.
 */
defineProps({
  node: { type: Object, required: true },
})
</script>

<template>
  <component :is="node.tag" v-bind="node.attrs">
    <SvgNode v-for="(child, i) in node.children" :key="i" :node="child" />
  </component>
</template>
