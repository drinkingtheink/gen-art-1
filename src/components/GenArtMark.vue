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
     
     The mark is a frame on a stand, and only the top 57% of the artwork is the
     frame — the rest is the gap and the legs. So matching the *whole* mark to
     the cap height, which is the obvious reading of standing level with the
     words, puts the frame at 0.57x the caps and its bars at about 1.2px
     against bold stems of 3. It measures level and it looks slight.
     
     Matching the frame instead is what makes the two read as equals: 1.3em
     puts it at 1.03x cap height, measured against this font rather than
     assumed. The stand then hangs below the baseline, like a descender.
     
     In em, so one number holds at any size the wordmark is set at. */
  height: 1.3em;
  width: auto;
  /* Off the line box's centre and onto the cap band. The box is centred on a
     line that includes descender space an uppercase wordmark never uses, which
     lands it low. At this offset the frame's top sits on the cap line and its
     bottom on the baseline. */
  transform: translateY(-0.08em);
  fill: var(--accent);
}
</style>
