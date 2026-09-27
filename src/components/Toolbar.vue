<script setup>
import { computed, ref, watch } from 'vue'
import { generators } from '@/generators/index.js'

/**
 * Which piece, which seed. The seed is an editable text field, not just a
 * readout — typing a seed someone else read out to you is the point.
 */
const props = defineProps({
  generatorId: { type: String, required: true },
  seed: { type: String, required: true },
})

const emit = defineEmits(['select-generator', 'set-seed', 'reroll', 'reset'])

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
      <button type="button" class="primary" @click="emit('reroll')">Re-roll</button>
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

.field-label {
  color: var(--ink-dim);
  font-size: 0.78rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
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
  color: #1a1408;
  border-color: #c99a36;
  font-weight: 600;
}

.primary:hover {
  background: #eec161;
  border-color: #c99a36;
}
</style>
