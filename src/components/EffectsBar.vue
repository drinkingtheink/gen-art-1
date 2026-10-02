<script setup>
import { computed } from 'vue'
import { BLEND_MODES } from '../core/grain.js'
import { EFFECT_DEFAULTS, SCANLINE_BLENDS } from '../core/effects.js'

/**
 * Post effects, grouped together because they all act on the finished piece
 * rather than on how it was made.
 */
const props = defineProps({
  effects: { type: Object, required: true },
  grain: { type: Object, required: true },
})

const emit = defineEmits(['update-effects', 'update-grain'])

const blends = BLEND_MODES
const scanlineBlends = SCANLINE_BLENDS

const anyOn = computed(
  () =>
    props.effects.scanlines > 0 ||
    props.effects.glitch > 0 ||
    props.effects.bloom > 0 ||
    props.effects.aberration > 0 ||
    props.effects.vignette > 0 ||
    props.grain.amount > 0,
)

/**
 * Back to the defaults, read from where the defaults live.
 *
 * This used to carry its own copy of every number, which is how it ended up
 * still resetting an effect that no longer exists: two lists, one edited.
 */
function reset() {
  emit('update-effects', { ...EFFECT_DEFAULTS })
  emit('update-grain', { amount: 0 })
}
</script>

<template>
  <div class="fx">
    <span class="field-label">Effects</span>

    <label class="row">
      <span class="lbl"><span>Scanlines</span><output>{{ effects.scanlines.toFixed(2) }}</output></span>
      <input type="range" min="0" max="1" step="0.01" :value="effects.scanlines"
             @input="emit('update-effects', { scanlines: Number($event.target.value) })" />
    </label>
    <template v-if="effects.scanlines > 0">
      <label class="row sub">
        <span class="lbl"><span>Line gap</span><output>{{ effects.scanlineGap.toFixed(1) }}</output></span>
        <input type="range" min="3" max="30" step="0.5" :value="effects.scanlineGap"
               @input="emit('update-effects', { scanlineGap: Number($event.target.value) })" />
      </label>
      <select class="sub-select" :value="effects.scanlineBlend" aria-label="Scanline blend mode"
              @change="emit('update-effects', { scanlineBlend: $event.target.value })">
        <option v-for="b in scanlineBlends" :key="b.value" :value="b.value">{{ b.label }}</option>
      </select>
    </template>

    <label class="row">
      <span class="lbl"><span>Glitchy</span><output>{{ effects.glitch.toFixed(2) }}</output></span>
      <input type="range" min="0" max="1" step="0.01" :value="effects.glitch"
             @input="emit('update-effects', { glitch: Number($event.target.value) })" />
    </label>
    <label v-if="effects.glitch > 0" class="row sub">
      <span class="lbl"><span>Slice height</span><output>{{ effects.glitchScale.toFixed(3) }}</output></span>
      <input type="range" min="0.01" max="0.3" step="0.002" :value="effects.glitchScale"
             @input="emit('update-effects', { glitchScale: Number($event.target.value) })" />
    </label>

    <label class="row">
      <span class="lbl"><span>Bloom</span><output>{{ effects.bloom.toFixed(2) }}</output></span>
      <input type="range" min="0" max="1" step="0.01" :value="effects.bloom"
             @input="emit('update-effects', { bloom: Number($event.target.value) })" />
    </label>
    <template v-if="effects.bloom > 0">
      <label class="row sub">
        <span class="lbl"><span>Radius</span><output>{{ effects.bloomRadius.toFixed(1) }}</output></span>
        <input type="range" min="1" max="40" step="0.5" :value="effects.bloomRadius"
               @input="emit('update-effects', { bloomRadius: Number($event.target.value) })" />
      </label>
      <label class="row sub">
        <span class="lbl"><span>Threshold</span><output>{{ effects.bloomThreshold.toFixed(2) }}</output></span>
        <input type="range" min="0" max="0.95" step="0.01" :value="effects.bloomThreshold"
               @input="emit('update-effects', { bloomThreshold: Number($event.target.value) })" />
      </label>
    </template>

    <label class="row">
      <span class="lbl"><span>Aberration</span><output>{{ effects.aberration.toFixed(1) }}</output></span>
      <input type="range" min="0" max="14" step="0.1" :value="effects.aberration"
             @input="emit('update-effects', { aberration: Number($event.target.value) })" />
    </label>
    <label v-if="effects.aberration > 0" class="row sub">
      <span class="lbl"><span>Angle</span><output>{{ Math.round(effects.aberrationAngle) }}°</output></span>
      <input type="range" min="0" max="360" step="1" :value="effects.aberrationAngle"
             @input="emit('update-effects', { aberrationAngle: Number($event.target.value) })" />
    </label>

    <label class="row">
      <span class="lbl"><span>Vignette</span><output>{{ effects.vignette.toFixed(2) }}</output></span>
      <input type="range" min="0" max="1" step="0.01" :value="effects.vignette"
             @input="emit('update-effects', { vignette: Number($event.target.value) })" />
    </label>
    <label v-if="effects.vignette > 0" class="row sub">
      <span class="lbl"><span>Spread</span><output>{{ effects.vignetteSpread.toFixed(2) }}</output></span>
      <input type="range" min="0.1" max="0.95" step="0.01" :value="effects.vignetteSpread"
             @input="emit('update-effects', { vignetteSpread: Number($event.target.value) })" />
    </label>

    <label class="row">
      <span class="lbl"><span>Grain</span><output>{{ grain.amount.toFixed(2) }}</output></span>
      <input type="range" min="0" max="1" step="0.01" :value="grain.amount"
             @input="emit('update-grain', { amount: Number($event.target.value) })" />
    </label>
    <template v-if="grain.amount > 0">
      <label class="row sub">
        <span class="lbl"><span>Tooth</span><output>{{ grain.scale.toFixed(2) }}</output></span>
        <input type="range" min="0.1" max="4" step="0.05" :value="grain.scale"
               @input="emit('update-grain', { scale: Number($event.target.value) })" />
      </label>
      <select class="sub-select" :value="grain.blend" aria-label="Grain blend mode"
              @change="emit('update-grain', { blend: $event.target.value })">
        <option v-for="b in blends" :key="b.value" :value="b.value">{{ b.label }}</option>
      </select>
    </template>

    <p v-if="anyOn" class="caveat">
      These are raster effects. They show on screen and in PNG; a pen plotter draws the clean
      geometry underneath.
    </p>
    <button v-if="anyOn" type="button" class="clear" @click="reset">Clear effects</button>
  </div>
</template>

<style scoped>
.fx { display: flex; flex-direction: column; gap: 0.4rem; }

.field-label {
  color: var(--ink-dim); font-size: 0.78rem; letter-spacing: 0.05em; text-transform: uppercase;
}

.row { display: flex; flex-direction: column; gap: 0.15rem; }
.row.sub { padding-left: 0.6rem; border-left: 1px solid var(--panel-edge); }

.lbl {
  display: flex; align-items: baseline; justify-content: space-between;
  color: var(--ink-dim); font-size: 0.75rem;
}
.row.sub .lbl { color: #6f6f7a; font-size: 0.72rem; }
.lbl output {
  color: var(--ink); font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-variant-numeric: tabular-nums;
}

input[type='range'] {
  width: 100%; height: 4px; margin: 0.28rem 0; padding: 0;
  background: #35353f; border: 0; border-radius: 2px; appearance: none; cursor: pointer;
}
input[type='range']::-webkit-slider-thumb {
  width: 13px; height: 13px; background: var(--accent); border: 0; border-radius: 50%; appearance: none;
}

.sub-select { width: calc(100% - 0.6rem); margin-left: 0.6rem; font-size: 0.78rem; }

.caveat { margin: 0.1rem 0 0; color: #6f6f7a; font-size: 0.72rem; line-height: 1.45; }
.clear { width: 100%; color: var(--ink-dim); font-size: 0.75rem; }
</style>
