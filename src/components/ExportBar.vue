<script setup>
import { computed, ref } from 'vue'
import { CSS_MODES } from '../core/css.js'

/**
 * Export controls. The work is done by the parent, which holds the stage
 * reference; this just collects the choice and reports what happened.
 */
const props = defineProps({
  busy: { type: Boolean, default: false },
  status: { type: String, default: '' },
  grainOn: { type: Boolean, default: false },
})

const emit = defineEmits(['export-svg', 'export-png', 'export-css'])

const scale = ref(2)
const cssMode = ref('svg')

// Noise is incompressible, so grain inflates a PNG by roughly 10-20x —
// measured 1.1MB to 22MB at 4x. Better to say so than to hand someone a
// surprise download.
const heavy = computed(() => props.grainOn && scale.value >= 4)

const modes = CSS_MODES

const cssHint = computed(() =>
  cssMode.value === 'file'
    ? 'Downloads the SVG and copies a rule pointing at it.'
    : 'Copies a rule with the whole piece inline as vector.',
)

// 1000px authored, so 4x is 4000px — about 13in at 300dpi, enough to frame.
const SCALES = [
  { value: 1, label: '1x · 1000px' },
  { value: 2, label: '2x · 2000px' },
  { value: 4, label: '4x · 4000px' },
  { value: 8, label: '8x · 8000px' },
]
</script>

<template>
  <div class="export">
    <span class="field-label">Export</span>

    <div class="row">
      <button type="button" :disabled="busy" @click="emit('export-svg')">SVG</button>
      <button type="button" :disabled="busy" @click="emit('export-png', scale)">PNG</button>
      <select v-model.number="scale" :disabled="busy" aria-label="PNG size">
        <option v-for="s in SCALES" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
    </div>

    <div class="row css">
      <button type="button" :disabled="busy" @click="emit('export-css', { mode: cssMode })">CSS</button>
      <select v-model="cssMode" :disabled="busy" aria-label="CSS background format">
        <option v-for="m in modes" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
    </div>

    <p class="status">{{ cssHint }}</p>

    <p v-if="heavy" class="status warn">
      Grain makes PNGs 10–20× larger — expect ~20MB+ at this size. SVG is unaffected.
    </p>

    <p v-if="status" class="status">{{ status }}</p>
  </div>
</template>

<style scoped>
.export {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-label {
  color: var(--ink-dim);
  font-size: 0.78rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.row {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 0.4rem;
}

/* One button and a wide select, where the row above has two buttons. */
.row.css {
  grid-template-columns: auto 1fr;
}

.row select {
  min-width: 0;
  font-size: 0.8rem;
}

button:disabled {
  opacity: 0.5;
  cursor: progress;
}

.status {
  margin: 0;
  color: var(--ink-dim);
  font-size: 0.75rem;
  line-height: 1.4;
}

.warn {
  color: #c9a24a;
}
</style>
