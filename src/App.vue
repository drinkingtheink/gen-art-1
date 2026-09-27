<script setup>
import { ref } from 'vue'
import ControlPanel from '@/components/ControlPanel.vue'
import SvgStage from '@/components/SvgStage.vue'
import Toolbar from '@/components/Toolbar.vue'
import { useGenerator } from '@/composables/useGenerator.js'
import { usePermalink } from '@/composables/usePermalink.js'
import { readHash } from '@/core/permalink.js'

// A shared link is the starting state; otherwise a fresh random seed.
const piece = useGenerator(readHash() ?? {})
usePermalink(piece)

const {
  generator,
  generatorId,
  seed,
  params,
  scene,
  setParam,
  selectGenerator,
  setSeed,
  reroll,
  resetParams,
} = piece

const copied = ref(false)
let copyTimer = null

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = false }, 1600)
  } catch {
    // Clipboard blocked (insecure context, denied permission) — the URL is
    // already in the address bar, so there's nothing to recover from.
    copied.value = false
  }
}
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <header class="head">
        <h1 class="wordmark">gen<span>·</span>art</h1>
        <p class="blurb">{{ generator.blurb }}</p>
      </header>

      <Toolbar
        :generator-id="generatorId"
        :seed="seed"
        @select-generator="selectGenerator"
        @set-seed="setSeed"
        @reroll="reroll"
        @reset="resetParams"
      />

      <button type="button" class="copy" @click="copyLink">
        {{ copied ? 'Link copied' : 'Copy link to this piece' }}
      </button>

      <hr class="rule" />

      <ControlPanel :generator="generator" :params="params" @update="setParam" />
    </aside>

    <main class="stage-area">
      <SvgStage :scene="scene" />
    </main>
  </div>
</template>

<style scoped>
.app {
  display: grid;
  grid-template-columns: var(--sidebar) 1fr;
  height: 100%;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  padding: 1rem;
  background: var(--panel);
  border-right: 1px solid var(--panel-edge);
}

.head {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.wordmark {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wordmark span {
  color: var(--accent);
}

.blurb {
  margin: 0;
  color: var(--ink-dim);
  font-size: 0.78rem;
  line-height: 1.45;
}

.copy {
  width: 100%;
  color: var(--ink-dim);
  font-size: 0.8rem;
}

.rule {
  width: 100%;
  height: 1px;
  margin: 0;
  background: var(--panel-edge);
  border: 0;
}

.stage-area {
  display: grid;
  place-items: center;
  min-height: 0;
  min-width: 0;
  padding: 1.5rem;
}
</style>
