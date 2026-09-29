<script setup>
defineProps({
  playing: { type: Boolean, required: true },
  speed: { type: Number, required: true },
  intensity: { type: Number, required: true },
  cyclePalette: { type: Boolean, required: true },
  fps: { type: Number, default: 0 },
  frameMs: { type: Number, default: 0 },
  modulated: { type: Array, default: () => [] },
})

const emit = defineEmits(['toggle', 'update', 'present'])
</script>

<template>
  <div class="showcase">
    <span class="field-label">
      <span>Animate</span>
      <output v-if="playing && fps" class="fps" :class="{ poor: fps < 20 }">{{ fps }}fps · {{ frameMs }}ms</output>
    </span>

    <div class="buttons">
      <button type="button" class="play" @click="emit('toggle')">
        {{ playing ? 'Pause' : 'Play' }}
      </button>
      <button type="button" title="Fill the screen with no interface — for screen recording" @click="emit('present')">
        Present
      </button>
    </div>

    <label class="row">
      <span class="sub">
        <span>Speed</span><output>{{ speed.toFixed(2) }}×</output>
      </span>
      <input type="range" min="0.1" max="3" step="0.05" :value="speed"
             @input="emit('update', { speed: Number($event.target.value) })" />
    </label>

    <label class="row">
      <span class="sub">
        <span>Intensity</span><output>{{ intensity.toFixed(2) }}</output>
      </span>
      <input type="range" min="0" max="2" step="0.05" :value="intensity"
             @input="emit('update', { intensity: Number($event.target.value) })" />
    </label>

    <label class="check">
      <input type="checkbox" :checked="cyclePalette"
             @change="emit('update', { cyclePalette: $event.target.checked })" />
      <span>Cycle palette</span>
    </label>

    <p v-if="modulated.length" class="moving">
      Moving: {{ modulated.join(', ') }}
    </p>
    <p v-else class="moving">Nothing to animate on this piece.</p>
  </div>
</template>

<style scoped>
.showcase { display: flex; flex-direction: column; gap: 0.5rem; }

.field-label {
  display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem;
  color: var(--ink-dim); font-size: 0.78rem; letter-spacing: 0.05em; text-transform: uppercase;
}

.fps {
  color: #7fbf7f; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.72rem; letter-spacing: 0; text-transform: none;
}
.fps.poor { color: #d08a4a; }

.buttons { display: grid; grid-template-columns: 1fr auto; gap: 0.4rem; }

.play { background: var(--accent); color: var(--accent-ink); border-color: var(--accent-edge); font-weight: 600; }
.play:hover { background: var(--accent-hot); border-color: var(--accent-edge); }

.row { display: flex; flex-direction: column; gap: 0.2rem; }

.sub {
  display: flex; align-items: baseline; justify-content: space-between;
  color: var(--ink-dim); font-size: 0.75rem;
}
.sub output { color: var(--ink); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; }

input[type='range'] {
  width: 100%; height: 4px; margin: 0.3rem 0; padding: 0;
  background: #35353f; border: 0; border-radius: 2px; appearance: none; cursor: pointer;
}
input[type='range']::-webkit-slider-thumb {
  width: 13px; height: 13px; background: var(--accent); border: 0; border-radius: 50%; appearance: none;
}

.check { display: flex; align-items: center; gap: 0.45rem; color: var(--ink-dim); font-size: 0.78rem; }

.moving { margin: 0; color: #6f6f7a; font-size: 0.72rem; line-height: 1.45; }
</style>
