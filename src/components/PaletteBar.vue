<script setup>
import { computed } from 'vue'
import { applyTreatment, backgroundChoices, palettes } from '../core/palettes.js'

/**
 * How the chosen palette gets used — which colour is paper, which dominates,
 * which are in play. Shows the result rather than describing it: the ink row
 * is the actual order generators will draw from.
 */
const props = defineProps({
  palette: { type: Object, required: true },
  treatment: { type: Object, required: true },
  /** The generator's palette param, so choosing and using sit together. */
  selected: { type: String, default: '' },
})

const emit = defineEmits(['update', 'select'])

const all = palettes

const backgrounds = computed(() => backgroundChoices(props.palette))
const resolved = computed(() => applyTreatment(props.palette, props.treatment))

function toggleMute(index) {
  const muted = props.treatment.muted.includes(index)
    ? props.treatment.muted.filter((i) => i !== index)
    : [...props.treatment.muted, index]
  emit('update', { muted })
}
</script>

<template>
  <div class="treat">
    <span class="field-label">
      <span>Palette</span>
      <span class="name">{{ palette.name }}</span>
    </span>

    <div class="chips" role="group" aria-label="Palette">
      <button
        v-for="p in all"
        :key="p.id"
        type="button"
        class="chip"
        :class="{ on: p.id === selected }"
        :title="p.name"
        :aria-pressed="p.id === selected"
        @click="emit('select', p.id)"
      >
        <span v-for="c in p.colors" :key="c" class="stripe" :style="{ background: c }" />
      </button>
    </div>

    <div class="block">
      <span class="sub">Background</span>
      <div class="swatches">
        <button
          v-for="choice in backgrounds"
          :key="choice.value"
          type="button"
          class="sw"
          :class="{ on: treatment.bg === choice.value }"
          :style="{ background: choice.color }"
          :title="choice.label"
          :aria-pressed="treatment.bg === choice.value"
          @click="emit('update', { bg: choice.value })"
        />
      </div>
    </div>

    <div class="block">
      <span class="sub">
        <span>Inks — click to mute</span>
        <span class="count">{{ resolved.colors.length }}/{{ palette.colors.length }}</span>
      </span>
      <div class="swatches">
        <button
          v-for="(color, i) in palette.colors"
          :key="color + i"
          type="button"
          class="sw tall"
          :class="{ muted: treatment.muted.includes(i) }"
          :style="{ background: color }"
          :title="treatment.muted.includes(i) ? 'Muted — click to restore' : 'Click to mute'"
          @click="toggleMute(i)"
        />
      </div>
    </div>

    <div class="block">
      <span class="sub">Order — sets which colour dominates</span>
      <div class="order">
        <button type="button" @click="emit('update', { rotate: (treatment.rotate + 4) % 5 })">‹</button>
        <div class="preview">
          <span
            v-for="(color, i) in resolved.colors"
            :key="color + i"
            class="band"
            :style="{ background: color, flexGrow: resolved.colors.length - i }"
          />
        </div>
        <button type="button" @click="emit('update', { rotate: (treatment.rotate + 1) % 5 })">›</button>
        <button
          type="button"
          class="flip"
          :class="{ on: treatment.invert }"
          title="Reverse quiet-to-loud ordering"
          @click="emit('update', { invert: !treatment.invert })"
        >
          Flip
        </button>
      </div>
    </div>

    <button
      v-if="treatment.bg !== -1 || treatment.rotate || treatment.invert || treatment.muted.length"
      type="button"
      class="clear"
      @click="emit('update', { bg: -1, rotate: 0, invert: false, muted: [] })"
    >
      Reset palette use
    </button>
  </div>
</template>

<style scoped>
.treat { display: flex; flex-direction: column; gap: 0.6rem; }

.field-label {
  display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem;
  color: var(--ink-dim); font-size: 0.78rem; letter-spacing: 0.05em; text-transform: uppercase;
}
.name { color: var(--accent); letter-spacing: 0; text-transform: none; font-size: 0.75rem; }

.chips {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.25rem;
  /* Forty chips is a wall in a 288px column, so the grid scrolls rather than
     pushing every other control off the panel. */
  max-height: 148px;
  overflow-y: auto;
  padding-right: 0.15rem;
  margin-bottom: 0.15rem;
  scrollbar-width: thin;
}

.chips::-webkit-scrollbar {
  width: 6px;
}

.chips::-webkit-scrollbar-thumb {
  background: var(--panel-edge);
  border-radius: 3px;
}

.chip {
  display: flex;
  height: 22px;
  padding: 0;
  overflow: hidden;
  background: none;
  border: 1px solid var(--panel-edge);
  border-radius: 4px;
}

.stripe { flex: 1; }

.chip:hover { border-color: #5a5a6b; }
.chip.on { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }

.block { display: flex; flex-direction: column; gap: 0.28rem; }

.sub {
  display: flex; align-items: baseline; justify-content: space-between;
  color: #6f6f7a; font-size: 0.72rem;
}
.count { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

.swatches { display: flex; gap: 0.22rem; }

.sw {
  flex: 1; height: 20px; padding: 0;
  border: 1px solid #00000055; border-radius: 3px; cursor: pointer;
}
.sw.tall { height: 26px; }
.sw:hover { transform: translateY(-1px); }
.sw.on { box-shadow: 0 0 0 2px var(--accent); }

/* A muted colour still shows which colour it is, struck through. */
.sw.muted { opacity: 0.3; position: relative; }
.sw.muted::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(to bottom right, transparent 45%, var(--ink) 45%, var(--ink) 55%, transparent 55%);
}

.order { display: grid; grid-template-columns: auto 1fr auto auto; gap: 0.25rem; align-items: stretch; }
.order button { padding: 0.2rem 0.5rem; font-size: 0.8rem; }

.preview { display: flex; overflow: hidden; border: 1px solid var(--panel-edge); border-radius: 3px; }
.band { min-width: 3px; }

.flip { font-size: 0.72rem; }
.flip.on { background: var(--accent); color: #1a1408; border-color: #c99a36; }

.clear { width: 100%; color: var(--ink-dim); font-size: 0.75rem; }
</style>
