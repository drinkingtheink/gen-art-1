<script setup>
/**
 * The chain link on a copy button, and the tick it becomes.
 *
 * Two states in one component rather than two components, because they are
 * one control: the tick is the same button a moment later, and swapping the
 * whole element would restart the layout rather than change the glyph.
 *
 * Stroked, where the project mark is deliberately solid. The mark is a fixed
 * shape in the accent colour and has to stay exact at any size; this is an
 * affordance sitting inside a sentence, so it takes `currentColor` and a
 * weight chosen against the text beside it. A solid glyph at 0.8rem next to
 * dimmed 0.8rem text reads heavier than the words it belongs to.
 *
 * Sized in `em` like everything else here, so it holds at the sidebar's
 * 0.8rem and anywhere else a copy button turns up without either place
 * knowing anything about it.
 */

defineProps({
  /** Copied just now — show the tick instead of the link. */
  done: { type: Boolean, default: false },
})
</script>

<template>
  <!-- Decorative: the button's own words say what it does, and a screen
       reader announcing "link" before "Copy link to this piece" is noise. -->
  <svg
    class="icon"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-if="done" d="M4.5 12.6 9.6 17.7 19.5 6.6" />
    <template v-else>
      <!-- The bar through the middle, and the two half-links it joins. Drawn
           on the diagonal because a horizontal chain link at this size reads
           as a minus sign with decoration. -->
      <path d="M9.6 14.4 14.4 9.6" />
      <path d="M12.7 6.5 14.8 4.4a4.1 4.1 0 0 1 5.8 5.8l-2.1 2.1" />
      <path d="M11.3 17.5 9.2 19.6a4.1 4.1 0 0 1-5.8-5.8l2.1-2.1" />
    </template>
  </svg>
</template>

<style scoped>
.icon {
  display: block;
  /* Never squeezed by the label beside it: in a flex row an SVG with no
     intrinsic width is the first thing to be crushed when the text is long,
     and "Copy link to this piece" is long. */
  flex: none;
  width: 1.05em;
  height: 1.05em;
  /* Optical centring. The box is centred on a line box that includes
     descender space, which sits the glyph a touch low against the caps of a
     short label. */
  transform: translateY(-0.03em);
}
</style>
