<script setup>
import { frames } from '../core/mounts.js'

/**
 * Which frame the work is hung in.
 *
 * Its own component because the question is asked in two places now: over the
 * grid, where you are comparing rooms, and inside the enlarged plate, where
 * you are looking at one. Those are the two moments the answer changes, and a
 * picker that existed only on the grid meant backing out of the close look to
 * change frame and then going back in to see what it did.
 *
 * Stateless. The frame lives in the URL — see `w` in core/permalink.js — so
 * this only reports a press and renders what it is told.
 */

defineProps({
  /** The frame currently on, by id. */
  frame: { type: String, required: true },
})

const emit = defineEmits(['pick'])
</script>

<template>
  <div class="frames" role="group" aria-label="Frame">
    <button
      v-for="f in frames"
      :key="f.id"
      type="button"
      :class="{ on: f.id === frame }"
      :aria-pressed="f.id === frame"
      @click="emit('pick', f.id)"
    >
      {{ f.name }}
    </button>
  </div>
</template>

<style scoped>
.frames {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.frames button {
  font-size: 0.8rem;
}

.frames button.on {
  color: var(--accent-ink);
  background: var(--accent);
  border-color: var(--accent-edge);
}

.frames button.on:hover {
  background: var(--accent-hot);
}
</style>
