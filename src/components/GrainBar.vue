<script setup>
import { BLEND_MODES } from '@/core/grain.js'

/**
 * Grain sits apart from the generator's params because it isn't one — it's
 * applied over whatever the piece turned out to be.
 */
defineProps({
  grain: { type: Object, required: true },
})

const emit = defineEmits(['update'])

const blends = BLEND_MODES
</script>

<template>
  <div class="grain">
    <label class="row">
      <span class="label">
        <span>Grain</span>
        <output class="value">{{ grain.amount.toFixed(2) }}</output>
      </span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="grain.amount"
        @input="emit('update', { amount: Number($event.target.value) })"
      />
    </label>

    <template v-if="grain.amount > 0">
      <label class="row">
        <span class="label">
          <span>Tooth</span>
          <output class="value">{{ grain.scale.toFixed(2) }}</output>
        </span>
        <input
          type="range"
          min="0.1"
          max="4"
          step="0.05"
          :value="grain.scale"
          @input="emit('update', { scale: Number($event.target.value) })"
        />
      </label>

      <select
        :value="grain.blend"
        aria-label="Grain blend mode"
        @change="emit('update', { blend: $event.target.value })"
      >
        <option v-for="b in blends" :key="b.value" :value="b.value">{{ b.label }}</option>
      </select>

      <p class="caveat">Grain is a raster effect. It shows on screen and in PNG; a pen plotter draws the clean geometry underneath.</p>
    </template>
  </div>
</template>

<style scoped>
.grain {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--ink-dim);
  font-size: 0.78rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.value {
  color: var(--ink);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
}

input[type='range'] {
  width: 100%;
  height: 4px;
  margin: 0.35rem 0;
  padding: 0;
  background: #35353f;
  border: 0;
  border-radius: 2px;
  appearance: none;
  cursor: pointer;
}

input[type='range']::-webkit-slider-thumb {
  width: 13px;
  height: 13px;
  background: var(--accent);
  border: 0;
  border-radius: 50%;
  appearance: none;
}

select {
  width: 100%;
  font-size: 0.8rem;
}

.caveat {
  margin: 0;
  color: #6f6f7a;
  font-size: 0.72rem;
  line-height: 1.45;
}
</style>
