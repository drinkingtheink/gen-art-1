<script setup>
import ParamControl from './ParamControl.vue'

/**
 * Walks the active generator's param schema. It knows nothing about any
 * particular generator — add a param to a generator module and a control
 * appears here with no edit to this file.
 */
defineProps({
  generator: { type: Object, required: true },
  params: { type: Object, required: true },
})

const emit = defineEmits(['update'])
</script>

<template>
  <div class="panel">
    <ParamControl
      v-for="spec in generator.params"
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
