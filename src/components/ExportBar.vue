<script setup>
import { computed, ref, useTemplateRef, watch } from 'vue'
import { MAX_RASTER_EDGE, PNG_SCALES } from '../core/export.js'

/**
 * Export controls. The work is done by the parent, which holds the stage
 * reference; this just collects the choice and reports what happened.
 */
const props = defineProps({
  busy: { type: Boolean, default: false },
  status: { type: String, default: '' },
  grainOn: { type: Boolean, default: false },
  /** The piece's authored size, which is what a print size is measured from. */
  canvas: { type: Object, default: () => ({ width: 1000, height: 1000 }) },
  /** The rule itself, once asked for. Empty means the panel is closed. */
  css: { type: String, default: '' },
  cssNote: { type: String, default: '' },
})

const emit = defineEmits(['export-svg', 'export-png', 'export-css', 'close-css'])

const scale = ref(2)

// Noise is incompressible, so grain inflates a PNG by roughly 10-20x —
// measured 1.1MB to 22MB at 4x. Better to say so than to hand someone a
// surprise download.
const heavy = computed(() => props.grainOn && scale.value >= 4)

/**
 * The panel is the point: the rule is visible and selectable, so copying works
 * by hand even where the clipboard API is refused — an insecure origin, a
 * denied permission, a window that isn't focused. Nothing is ever written to
 * disk, so there is no second file to keep track of.
 */
const box = useTemplateRef('box')
/** '' before a try, then 'copied' or 'selected' — never claiming the first for the second. */
const copyState = ref('')
let copyTimer = null

const copyLabel = computed(() => {
  if (copyState.value === 'copied') return 'Copied'
  if (copyState.value === 'selected') return `Selected — press ${modifier}C`
  return 'Copy'
})

const modifier = /Mac|iPhone|iPad/.test(navigator.platform ?? '') ? '\u2318' : 'Ctrl-'

// Opening selects the lot, so the next keystroke can be a plain copy.
watch(
  () => props.css,
  async (text) => {
    copyState.value = ''
    if (!text) return
    await Promise.resolve()
    box.value?.select()
  },
)

async function copy() {
  let ok = true
  try {
    await navigator.clipboard.writeText(props.css)
  } catch {
    // Refused — insecure origin, denied permission, an unfocused window. The
    // text is on screen and stays selected, so say what actually happened and
    // let the keyboard finish the job.
    ok = false
  }
  box.value?.select()
  copyState.value = ok ? 'copied' : 'selected'
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { copyState.value = '' }, ok ? 1600 : 4000)
}

/**
 * What the chosen scale actually gets you, on paper.
 *
 * Printing is half the point of the PNG path and the control said nothing
 * about it — a multiplier and a pixel count leave you to do the arithmetic
 * for a thing the app already knows. Sizes come from the piece's own canvas
 * rather than a fixed 1000px, because ratios hold area constant: the same 4x
 * is 13in square or 18in wide depending on the shape on screen.
 *
 * 300dpi is the number a print shop means by photographic quality.
 */
const printSize = computed(() => {
  const { width, height } = props.canvas
  const longest = Math.max(width, height)
  // The exporter clamps past this, so the readout has to as well or it
  // promises a size the file won't be.
  const clamped = longest * scale.value > MAX_RASTER_EDGE
  const used = clamped ? MAX_RASTER_EDGE / longest : scale.value
  const px = (n) => Math.round(n * used)
  const inches = (n) => (px(n) / 300).toFixed(1)
  return { w: px(width), h: px(height), inW: inches(width), inH: inches(height), clamped }
})

/* Labelled here, but the multipliers themselves are shared — the about page
   has to answer in the same ones this menu offers. */
const SCALES = PNG_SCALES.map((value) => ({ value, label: `${value}x · ${value * 1000}px` }))
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

    <p class="status">
      {{ printSize.w }}×{{ printSize.h }}px — {{ printSize.inW }}×{{ printSize.inH }}in at 300dpi{{ printSize.clamped ? ', clamped to what a browser will raster' : '' }}
    </p>

    <div class="row css">
      <button type="button" :disabled="busy" @click="emit('export-css')">
        {{ css ? 'Rebuild CSS' : 'CSS background' }}
      </button>
      <button v-if="css" type="button" class="ghost" @click="emit('close-css')">Close</button>
    </div>

    <div v-if="css" class="panel">
      <textarea ref="box" class="code" readonly spellcheck="false" :value="css" @focus="box?.select()" />
      <div class="panel-foot">
        <button type="button" @click="copy">{{ copyLabel }}</button>
        <span class="note">{{ cssNote }}</span>
      </div>
    </div>

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

/* One wide button, or two once the panel is open. */
.row.css {
  grid-template-columns: 1fr auto;
}


.ghost {
  background: none;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.code {
  width: 100%;
  height: 8.5rem;
  padding: 0.5rem;
  color: var(--ink);
  background: var(--bg);
  border: 1px solid var(--panel-edge);
  border-radius: var(--radius);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.68rem;
  line-height: 1.5;
  /* The rule is one very long line; wrapping it keeps the box readable and the
     selection intact. */
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  resize: vertical;
}

.panel-foot {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.note {
  color: var(--ink-dim);
  font-size: 0.72rem;
  line-height: 1.35;
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
