<script setup>
/**
 * The JH monogram, carried over from jmh-portfolio-pro so the projects share a
 * mark. Same geometry; the original's SCSS variables are inlined here because
 * this project has no sass, and the colour cycle is kept because that slow
 * drift is the recognisable part.
 */
</script>

<template>
  <svg
    class="monogram"
    data-name="Layer 1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 285.06 318.32"
    role="img"
    aria-label="JH"
  >
    <polygon
      points="257.18 73.95 285.06 63.13 218.06 63.13 218.06 89.13 218.08 89.12 218.08 132.85 203.06 132.85 203.06 157.5 218.08 157.5 218.08 209.13 218.06 209.13 218.06 235.13 218.08 235.13 257.18 235.13 285.06 235.13 257.18 224.31 257.18 73.95"
    />
    <path
      d="M154,6.87H25v67L37.89,40.65H156.48v98.77H131.1V70.36H131V70H64L92,80.86V231.14L64,242h67v-.3h.1V164.07h25.38v52.16c0,51.39-20,73.75-64.24,73.75-24.26,0-49-13.32-67.09-40.92L-.06,273.33C21.82,309,58.46,325.19,93.2,325.19c77.55,0,103.72-47.58,103.72-105.63V6.87Z"
      transform="translate(0.06 -6.87)"
    />
  </svg>
</template>

<style scoped>
.monogram {
  display: block;
  flex: none;
  width: 19px;
  height: auto;
}

.monogram * {
  fill: var(--ink);
  transition: fill 0.3s;
  animation: monogram-cycle 20s alternate infinite;
}

.monogram:hover * {
  fill: var(--accent);
  animation-play-state: paused;
}

/* The original's palette, inlined — it had these as SCSS variables. */
@keyframes monogram-cycle {
  0% {
    fill: #83e377;
  }
  20% {
    fill: #83e377;
  }
  30% {
    fill: lightsalmon;
  }
  40% {
    fill: #0db39e;
  }
  60% {
    fill: #83e377;
  }
  80% {
    fill: #f2f2f4;
  }
}

@media (prefers-reduced-motion: reduce) {
  .monogram * {
    animation: none;
  }
}
</style>
