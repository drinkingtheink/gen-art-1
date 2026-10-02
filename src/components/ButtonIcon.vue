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
   * same control a moment apart — `play` and `pause` are the two halves of
   * another, `back` is the way out of a panel, and `dice` is a roll.
   */
  glyph: {
    type: String,
    default: 'link',
    validator: (v) => ['link', 'tick', 'back', 'play', 'pause', 'regen', 'dice'].includes(v),
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

    <!-- Stroked like the rest rather than filled, which is the whole point of
         keeping them in one file: a solid triangle at this weight would read
         heavier than the words beside it and heavier than the tick it sits
         near. Both are inset to the same 5.9-18.1 band so the pair do not
         change size as the button changes state. -->
    <path v-else-if="glyph === 'play'" d="M9.7 5.9 18.1 12 9.7 18.1Z" />

    <template v-else-if="glyph === 'pause'">
      <path d="M9.6 5.9v12.2" />
      <path d="M14.4 5.9v12.2" />
    </template>

    <!-- Most of a circle, running out to a corner at the top right. The head
         is that corner rather than a V on the tangent: a barbed head at this
         size puts one barb across the circle's own gap and the whole thing
         reads as a hook with a tail. A bracket has only two strokes and both
         of them are straight, which is what survives being 13px wide. -->
    <template v-else-if="glyph === 'regen'">
      <path d="M20.6 5.4v4.9h-4.9" />
      <path d="M18.9 14.5A7.4 7.4 0 1 1 17.2 6.8l3.4 3.5" />
    </template>

    <!-- A die showing three, because three pips on the diagonal stay legible
         at 13px where five or six turn to a smudge. The pips are filled while
         everything else here is stroked — a 1.2 radius ring would close up at
         this size and read as a dot anyway, just a muddier one. -->
    <template v-else-if="glyph === 'dice'">
      <rect x="4.3" y="4.3" width="15.4" height="15.4" rx="3.4" />
      <g fill="currentColor" stroke="none">
        <circle cx="8.7" cy="15.3" r="1.25" />
        <circle cx="12" cy="12" r="1.25" />
        <circle cx="15.3" cy="8.7" r="1.25" />
      </g>
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
