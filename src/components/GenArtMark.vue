<script setup>
/**
 * The project mark: a frame, and the stand it sits on.
 *
 * Drawn as two solids with no strokes, so it stays exact at any size — the
 * frame's aperture is a hole in the path rather than a thin outline that would
 * thin out further as it scaled down.
 *
 * It sizes itself in `em` rather than pixels, so the same component sits
 * correctly beside the wordmark at 1.05rem in the sidebar and at 1.5rem on the
 * launch panel without either place knowing anything about it.
 */
</script>

<template>
  <!-- Decorative: the wordmark beside it already says the name, and a screen
       reader announcing "logo" twice is worse than not announcing it. -->
  <svg
    class="mark"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 114.86 150.48"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M111.23,85.84H3.62s0-85.84,0-85.84h107.61s0,85.84,0,85.84ZM100.51,75.19l-.02-64.58H14.36s-.02,64.58-.02,64.58h86.17Z"
    />
    <polygon
      points="93.29 123.6 21.57 123.55 21.56 150.42 10.81 150.47 10.83 123.63 0 123.61 .06 111.04 114.78 111.04 114.86 123.54 104.01 123.64 104.04 150.44 93.29 150.48 93.29 123.6"
    />
  </svg>
</template>

<style scoped>
.mark {
  display: block;
  flex: none;
  /* Cap height is about 0.7em, and a mark set to exactly that reads small
     against letterforms this widely tracked. A touch over twice cap height
     gives it the weight of a logo without out-shouting the name. */
  height: 1.45em;
  width: auto;
  /* Nudged down by a hair: the flexbox centres the mark on the line box, which
     includes descender space the uppercase wordmark never uses, so centred
     lands optically high. */
  transform: translateY(0.04em);
  fill: var(--accent);
}
</style>
