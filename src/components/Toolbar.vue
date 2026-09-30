<script setup>
import { computed, ref, watch } from 'vue'
import { ratioOptions } from '../core/ratios.js'
import { generators } from '../generators/index.js'

/**
 * Which piece, which seed. The seed is an editable text field, not just a
 * readout — typing a seed someone else read out to you is the point.
 */
const props = defineProps({
  generatorId: { type: String, required: true },
  /** What the selected piece does, in a line — it belongs under its own control. */
  blurb: { type: String, default: '' },
  ratioId: { type: String, required: true },
  canvas: { type: Object, required: true },
  seed: { type: String, required: true },
})

const emit = defineEmits(['select-generator', 'set-ratio', 'set-seed', 'regen', 'reset'])

const shapes = ratioOptions

const options = computed(() => generators)

// Local draft so typing a seed doesn't regenerate on every keystroke; it
// commits on blur or Enter.
const draft = ref(props.seed)
watch(() => props.seed, (value) => { draft.value = value })

function commit() {
  if (draft.value.trim() && draft.value !== props.seed) emit('set-seed', draft.value)
  else draft.value = props.seed
}
</script>

<template>
  <div class="toolbar">
    <label class="field">
      <span class="field-label">Piece</span>
      <select
        :value="generatorId"
        @change="emit('select-generator', $event.target.value)"
      >
        <option v-for="g in options" :key="g.id" :value="g.id">{{ g.name }}</option>
      </select>
    </label>

    <p v-if="blurb" class="blurb">{{ blurb }}</p>

    <label class="field">
      <span class="field-label">
        Shape
        <span class="dims">{{ canvas.width }}×{{ canvas.height }}</span>
      </span>
      <select :value="ratioId" @change="emit('set-ratio', $event.target.value)">
        <option v-for="s in shapes" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
    </label>

    <label class="field">
      <span class="field-label">Seed</span>
      <input
        v-model="draft"
        type="text"
        class="seed-input"
        spellcheck="false"
        autocomplete="off"
        @blur="commit"
        @keyup.enter="commit"
      />
    </label>

    <div class="buttons">
      <button type="button" class="primary" @click="emit('regen')">Re-gen</button>
      <button type="button" @click="emit('reset')">Reset</button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

/* Tucked up against the select it describes rather than floating between two
   controls, which is what the toolbar's even gap would do to it. */
.blurb {
  margin: -0.3rem 0 0;
  color: var(--ink-dim);
  font-size: 0.78rem;
  line-height: 1.45;
}

.field-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--ink-dim);
  font-size: 0.78rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.dims {
  color: #6f6f7a;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.72rem;
  letter-spacing: 0;
  text-transform: none;
}

.seed-input {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82rem;
}

.buttons {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.4rem;
}

.primary {
  background: var(--accent);
  color: var(--accent-ink);
  border-color: var(--accent-edge);
  font-weight: 600;
}

.primary:hover {
  background: var(--accent-hot);
  border-color: var(--accent-edge);
}
</style>
