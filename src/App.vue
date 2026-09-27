<script setup>
import SvgStage from '@/components/SvgStage.vue'

// Namespace probe: one of each shape kind the generators will emit, so a
// mis-namespaced <component :is> shows up immediately as a blank stage.
const scene = {
  width: 400,
  height: 400,
  background: '#f4eed2',
  shapes: [
    { tag: 'rect', attrs: { x: 20, y: 20, width: 160, height: 160, fill: '#003049' } },
    { tag: 'circle', attrs: { cx: 300, cy: 100, r: 70, fill: '#d62828' } },
    { tag: 'path', attrs: { d: 'M20 380 L180 220 L180 380 Z', fill: '#f77f00' } },
    { tag: 'line', attrs: { x1: 230, y1: 210, x2: 380, y2: 380, stroke: '#111', 'stroke-width': 6 } },
    { tag: 'polygon', attrs: { points: '230,380 380,210 380,380', fill: '#fcbf49' } },
  ],
}
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <h1 class="wordmark">gen<span>·</span>art</h1>
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

.stage-area {
  display: grid;
  place-items: center;
  min-height: 0;
  min-width: 0;
  padding: 1.5rem;
}
</style>
