<script setup>
// Layout shell. Controls land in the sidebar, the piece renders in the stage.
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <h1 class="wordmark">gen<span>·</span>art</h1>
    </aside>

    <main class="stage-area">
      <div class="stage-frame" />
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
  min-width: 0;
  padding: 1.5rem;
}

.stage-frame {
  aspect-ratio: 1;
  width: min(100%, 100cqh);
  max-height: 100%;
  background: #0f0f13;
  border: 1px solid var(--panel-edge);
}
</style>
