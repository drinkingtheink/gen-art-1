<script setup>
import SvgStage from '@/components/SvgStage.vue'
import { useGenerator } from '@/composables/useGenerator.js'

const { generator, seed, scene, reroll } = useGenerator({ seed: 'quiet-heron-41' })
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <h1 class="wordmark">gen<span>·</span>art</h1>
      <p class="blurb">{{ generator.blurb }}</p>
      <button type="button" @click="reroll">Re-roll seed</button>
      <code class="seed">{{ seed }}</code>
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
  gap: 0.75rem;
  overflow-y: auto;
  padding: 1rem;
  background: var(--panel);
  border-right: 1px solid var(--panel-edge);
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
  font-size: 0.8rem;
  line-height: 1.45;
}

.seed {
  color: var(--accent);
  font-size: 0.8rem;
}

.stage-area {
  display: grid;
  place-items: center;
  min-height: 0;
  min-width: 0;
  padding: 1.5rem;
}
</style>
