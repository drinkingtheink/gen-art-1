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
  /* Sized so the frame matches the wordmark's cap height.
     
     The frame is the top 57% of the artwork — the rest is the gap and the
     stand — so a mark of 1.3em puts the frame at 1.03x the caps, measured
     against this font rather than assumed. The previous 1.7em was set from a
     guessed cap height of 0.7em; measured, the caps are 10.62px at this size
     and that made the frame 1.34x them and the whole mark 2.35x, which is why
     it out-shouted the name.
     
     Everything is in em, so the same numbers hold beside the 1.05rem sidebar
     wordmark and the 1.5rem one on the launch panel. */
  height: 1.3em;
  width: auto;
  /* Lifts the frame off the line box's centre and onto the cap band: the box
     is centred on a line that includes descender space the uppercase wordmark
     never uses, which lands it low. At this offset the frame's top sits on the
     cap line and its bottom on the baseline, to within a third of a pixel,
     leaving the stand to hang below like a descender. */
  transform: translateY(-0.08em);
  fill: var(--accent);
}
</style>
