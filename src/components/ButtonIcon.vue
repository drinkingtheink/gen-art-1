<script setup>
/**
 * The glyph on a button, and the one rule for what glyphs on buttons look like.
 *
 * One component rather than one per icon, because the shape is the only thing
 * that differs and everything else — the size, the weight, where it sits on
 * the line — is what makes a set of buttons read as a set. Split into a file
 * each, those numbers get copied, and then one of them gets tuned.
 *
 * Stroked, where the project mark is deliberately solid. The mark is a fixed
 * shape in the accent colour and has to stay exact at any size; these sit
 * inside a sentence, so they take `currentColor` and a weight chosen against
 * the text beside them. A solid glyph at 0.8rem next to dimmed 0.8rem text
 * reads heavier than the words it belongs to.
 *
 * Sized in `em` like the mark, so one number holds wherever a button turns up
 * without that place knowing anything about it.
 */

defineProps({
  /**
   * Which shape. `link` and `tick` are the two halves of a copy button — the
   * same control a moment apart — and `back` is the way out of a panel.
   */
  glyph: {
    type: String,
    default: 'link',
    validator: (v) => ['link', 'tick', 'back'].includes(v),
  },
})
</script>

<template>
  <!-- Decorative: every button carrying one of these has its own words, and a
       screen reader announcing "link" before "Copy link to this piece" is
       noise. -->
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
    <path v-if="glyph === 'tick'" d="M4.5 12.6 9.6 17.7 19.5 6.6" />

    <!-- A shaft long enough to read as travel rather than as a chevron. The
         head is a third of it, which is the proportion that still looks like
         an arrow once it is 13px wide. -->
    <template v-else-if="glyph === 'back'">
      <path d="M19.5 12H5.2" />
      <path d="M11 5.5 4.5 12l6.5 6.5" />
    </template>

    <!-- The bar through the middle, and the two half-links it joins. Drawn on
         the diagonal because a horizontal chain link at this size reads as a
         minus sign with decoration. -->
    <template v-else>
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
