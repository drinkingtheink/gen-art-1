<script setup>
import { computed } from 'vue'
import { palettes } from '@/core/palettes.js'

/**
 * One control, chosen by the param's `type`. Adding a new param type means
 * adding a branch here and nowhere else.
 *
 * Values are emitted raw — useGenerator's setParam runs them through coerce()
 * so there's a single place where clamping and snapping happen.
 */
const props = defineProps({
  spec: { type: Object, required: true },
  modelValue: { type: [Number, String, Boolean], default: undefined },
})

const emit = defineEmits(['update:modelValue'])

const id = computed(() => `param-${props.spec.key}`)

/** Match the displayed precision to the step, so 0.22 doesn't read as 0.2200000001. */
/** Every palette as a chip, so the choice is visible rather than named. */
const swatches = computed(() => palettes)

const display = computed(() => {
  if (props.spec.type !== 'range') return props.modelValue
  const step = String(props.spec.step ?? 1)
  const dot = step.indexOf('.')
  return Number(props.modelValue).toFixed(dot === -1 ? 0 : step.length - dot - 1)
})
</script>

<template>
  <div class="control" :class="`control--${spec.type}`">
    <component :is="spec.type === 'palette' ? 'span' : 'label'" class="label" :for="spec.type === 'palette' ? undefined : id">
      <span class="name">{{ spec.label }}</span>
      <output v-if="spec.type === 'range'" class="value">{{ display }}</output>
    </component>

    <input
      v-if="spec.type === 'range'"
      :id="id"
      type="range"
      :min="spec.min"
      :max="spec.max"
      :step="spec.step ?? 1"
      :value="modelValue"
      @input="emit('update:modelValue', Number($event.target.value))"
    />

    <div v-else-if="spec.type === 'palette'" class="palettes" role="group" :aria-label="spec.label">
      <button
        v-for="p in swatches"
        :key="p.id"
        type="button"
        class="chip"
        :class="{ on: p.id === modelValue }"
        :title="p.name"
        :aria-pressed="p.id === modelValue"
        @click="emit('update:modelValue', p.id)"
      >
        <span v-for="c in p.colors" :key="c" class="stripe" :style="{ background: c }" />
      </button>
    </div>

    <select
      v-else-if="spec.type === 'select'"
      :id="id"
      :value="modelValue"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <option v-for="opt in spec.options" :key="opt.value" :value="opt.value">
        {{ opt.label ?? opt.value }}
      </option>
    </select>

    <div v-else-if="spec.type === 'color'" class="color-row">
      <input
        :id="id"
        type="color"
        :value="modelValue"
        @input="emit('update:modelValue', $event.target.value)"
      />
      <code class="hex">{{ modelValue }}</code>
    </div>

    <input
      v-else-if="spec.type === 'toggle'"
      :id="id"
      type="checkbox"
      :checked="modelValue"
      @change="emit('update:modelValue', $event.target.checked)"
    />
  </div>
</template>

<style scoped>
.control {
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
}

.name {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.value {
  color: var(--ink);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
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
}

.palettes {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.3rem;
}

.chip {
  display: flex;
  height: 26px;
  padding: 0;
  overflow: hidden;
  background: none;
  border: 1px solid var(--panel-edge);
  border-radius: 4px;
}

.chip:hover {
  border-color: #5a5a6b;
}

.chip.on {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.stripe {
  flex: 1;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Native colour inputs render their swatch inset in a light chrome; strip it
   back so the swatch reads as a flat chip against the dark panel. */
input[type='color'] {
  width: 38px;
  height: 26px;
  padding: 0;
  background: none;
  border: 1px solid var(--panel-edge);
  border-radius: var(--radius);
  cursor: pointer;
  overflow: hidden;
  appearance: none;
}

input[type='color']::-webkit-color-swatch-wrapper {
  padding: 0;
}

input[type='color']::-webkit-color-swatch {
  border: 0;
  border-radius: 0;
}

.hex {
  color: var(--ink-dim);
  font-size: 0.78rem;
}
</style>
