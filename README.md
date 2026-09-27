# gen-art-1

A generative art gallery in Vue 3. Pieces are SVG, seeded, and shareable as a URL.

```bash
npm install
npm run dev
```

## The idea

A generator is a **pure function of `(params, rng)` that returns a scene description**. It never
touches the DOM, never calls `Math.random`, and knows nothing about Vue:

```js
generate({ params, rng, width, height }) {
  return { width, height, background: '#f4eed2', shapes: [ { tag, attrs, children } ] }
}
```

Everything else follows from that. The stage is a dumb renderer of `{ tag, attrs, children }`, so
generators can emit any SVG element — groups, clip paths, gradients — without the renderer learning
what any of them mean. Output stays real DOM: inspectable in devtools, copyable straight out as
vector. And because generation is pure with a freshly seeded rng each run, a seed reproduces a
piece exactly.

Controls are built from each generator's param schema, so **adding a piece of art is one file**.

## Adding a generator

Write the module, declaring params as data:

```js
// src/generators/myPiece.js
export default {
  id: 'my-piece',
  name: 'My Piece',
  blurb: 'One line for the sidebar.',
  params: [
    { key: 'density', type: 'range', label: 'Density', min: 1, max: 40, step: 1, default: 12 },
    { key: 'palette', type: 'select', label: 'Palette', options: paletteOptions, default: 'dusk' },
  ],
  generate({ params, rng, width, height }) { /* ... */ },
}
```

Then add one line to `src/generators/index.js`. Controls, seeding, URL state and validation all
come from the schema — there is nothing to wire up.

Param types are `range`, `select`, `color` and `toggle`. Adding a new one means one branch in
`src/components/ParamControl.vue` and one in `coerce()` in `src/core/params.js`, and nowhere else.

## Seeds and permalinks

Seeds are words — `quiet-heron-41` — so they survive being read aloud or skimmed in a URL. The full
state lives in the hash:

```
#g=subdivision&s=quiet-heron-41&p=maxDepth:6,splitChance:0.88,palette:flame,…
```

Readable and hand-editable on purpose. Every param is written out, including ones still at their
default, so a link keeps rendering the same piece even if a default is retuned later. Anything
invalid in the hash — out-of-range numbers, an unknown palette, broken percent-encoding — is
clamped or defaulted by `coerce()` rather than producing a blank stage.

Discrete choices (a new seed, a different generator, reset) push a history entry, so Back walks
through the pieces you looked at. Slider drags replace instead, so one gesture doesn't bury the
history.

## Layout

```
src/
  core/
    rng.js         seeded PRNG — xmur3 over mulberry32, plus speakable seeds
    noise.js       seeded 2D simplex + fBm
    palettes.js    named colour sets, ordered quiet -> loud
    params.js      schema defaults, coercion, clamping
    permalink.js   hash encode/decode
  generators/
    index.js       the registry — add a line here
    subdivision.js
    flowField.js
  components/
    SvgStage.vue   viewBox + background; delegates to SvgNode
    SvgNode.vue    recursive { tag, attrs, children } renderer
    ControlPanel.vue / ParamControl.vue   built from the schema
    Toolbar.vue    generator picker, seed field, re-roll, reset
  composables/
    useGenerator.js  generator + seed + params -> scene
    usePermalink.js  two-way URL sync
```

## Notes

Pieces are authored in a fixed 1000x1000 space and scaled by CSS, so a seed looks the same on any
screen and the output is resolution-independent.

Two different costs get conflated as "SVG is slow", and they have different fixes.

**Node count.** Subdivision's worst case is 1254 elements (a depth-9 binary tree caps at 512
leaves), well inside what SVG handles. Flow field is cheaper than it looks — each traced curve is
a single `<path>`, so 650 curves is 650 nodes, not 650 × its length.

**Path data.** This is what actually bites on line work. A curve traced at every step carries
hundreds of coordinates. Flow field rounds to 1dp and simplifies with a deviation bound of 0.6
units — sub-pixel at a 1000px display — which cuts markup by about 40% with no visible change.
Worth knowing if you add a generator that draws long paths.

A generator wanting tens of thousands of *elements* would still want a different surface.

Palettes run quiet → loud, which suits filled areas: the dominant colour sits nearest the paper.
Line work wants the opposite, so flow field reads the weighting from the loud end — thin strokes
in the quietest colour vanish against the background.

Not built yet, and nothing here precludes them: PNG export, a favourites strip, an animated mode.
