<script setup>
import ControlPanel from '@/components/ControlPanel.vue'
import SvgStage from '@/components/SvgStage.vue'
import Toolbar from '@/components/Toolbar.vue'
import { useGenerator } from '@/composables/useGenerator.js'

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
} = useGenerator()
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
