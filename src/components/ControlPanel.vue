<script setup>
import { computed } from 'vue'
import ParamControl from './ParamControl.vue'

/**
 * Walks the active generator's param schema. It knows nothing about any
 * particular generator — add a param to a generator module and a control
 * appears here with no edit to this file.
 */
const props = defineProps({
  generator: { type: Object, required: true },
  params: { type: Object, required: true },
})

const emit = defineEmits(['update'])

// Palette params are rendered by PaletteBar instead, so choosing a palette
// sits beside the controls for how it's used rather than halfway down the
// generator's own params.
const specs = computed(() => props.generator.params.filter((s) => s.type !== 'palette'))
</script>

<template>
  <div class="panel">
    <ParamControl
      v-for="spec in specs"
      :key="spec.key"
      :spec="spec"
      :model-value="params[spec.key]"
      @update:model-value="emit('update', spec.key, $event)"
    />
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
</style>
