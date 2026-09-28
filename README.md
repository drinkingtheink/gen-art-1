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
#g=subdivision&r=square&s=quiet-heron-41&p=maxDepth:6,splitChance:0.88,palette:flame,…
```

Readable and hand-editable on purpose. Every param is written out, including ones still at their
default, so a link keeps rendering the same piece even if a default is retuned later. Anything
invalid in the hash — out-of-range numbers, an unknown palette, broken percent-encoding — is
clamped or defaulted by `coerce()` rather than producing a blank stage.

Discrete choices (a new seed, a different generator, reset) push a history entry, so Back walks
through the pieces you looked at. Slider drags replace instead, so one gesture doesn't bury the
history.

## Getting work out

**SVG** is the real thing: the stage is already vector, so export is a matter of removing what the
app added (Vue's scoped-style attributes, layout classes) and giving the file an explicit size —
Firefox won't rasterise one without it. The result opens in Illustrator or Inkscape and goes
straight to a pen plotter, which reads SVG natively. Truchet and flow field suit plotting
especially well, being stroke-based already.

**PNG** rasterises the same serialised SVG through a canvas at 1–8x. At 4x that's 4000px, roughly
13 inches at 300dpi. The scene references no external images or fonts, so the canvas doesn't taint
and `toBlob` works. Anything past an 8192px edge is clamped, because browsers get unreliable and
memory-hungry beyond it.

Files are named for the piece — `gen-art-truchet-still-anvil-12.svg` — so a file on disk is still
traceable back to the seed that made it.

## Canvas shapes

Seven ratios, from square to 16:9, and both A-series orientations. They hold **area** constant
rather than a fixed edge, so a margin of 30 or a grid of 12 means the same density of work
whatever the shape. Square lands on exactly 1000x1000 — what every piece made before ratios
existed was authored at — and 1:√2 lands on 1189x841, which is A0 in millimetres, so an export
scales to any A size exactly.

Changing shape re-runs `generate()` on the new canvas with the same seed. The piece is
regenerated, not reflowed.

A link with no `r` resolves to square, so permalinks saved before shapes existed still render
byte-identically.

## Palettes

Forty sets, picked as swatches rather than named in a dropdown — the choice is the look, so it
should be visible. Each is scored on luminance range x mean saturation; anything below ~0.35 reads
as bland or midtone-heavy on screen and isn't kept. That measurement retired four sets from the
first twenty (a greyscale at 0.00, and three whose colours all sat at the same value), and killed
three of the second twenty before they shipped — including a near-monochrome one that failed the
same bar the greyscale did, which would have been the rule bending for a set I liked.

The second twenty were chosen to even out the first, which ran 13 light backgrounds to 7 dark and
leaned yellow/red/cyan/orange. Backgrounds are now 20/20. Dominant hue families still lean warm at
a 2.5-8.5 spread: the first twenty are kept, so perfect evenness isn't reachable by adding alone.

No two sets share three or more colours, and none are near-identical by mean nearest-colour
distance.

**Palette use** is separate from *which* palette, and sits beside it:

- **Background** — the paper can be the palette's own, any of its five colours, or neutral paper/ink
- **Inks** — click any colour to mute it; muting everything falls back to the full set rather than
  leaving generators nothing to draw with
- **Order** — rotate which colour dominates, or flip the quiet-to-loud ordering

Treatment is canvas state like the shape and the grain, so it applies to whatever piece is on
screen, and it composes with showcase's palette cycling: a cycling piece keeps its background
choice and muting as it moves through the sets. It rides the same resolved-palette override that
cycling introduced, so no generator needed changing.

`bg` indexes the palette's *original* colours, so the swatch you click is the colour you get
whatever muting and rotation are doing to the ink order.

Colour changes ease rather than cut — a 600ms CSS transition on `fill`, `stroke` and their
opacities. `fill` and `stroke` are presentation attributes, which act as low-priority CSS
declarations, so changing them triggers a transition like any other property. That covers palette
switches, background swaps, muting an ink and rotating the order, all from one rule.

Deliberately *not* `stroke-width` or geometry: those are modulated every frame during showcase and
easing them would lag the motion rather than smooth it. Neither `fill` nor `stroke` is
compositor-accelerated, so a switch repaints every affected element for the duration — up to one
transition per element, around 2000 on a maxed flow field. Watch the fps readout on the heavy
pieces. `prefers-reduced-motion` disables it.

The cycle's own hold-to-transition ramp is smoothstepped: a linear cross-fade reads as a wipe, an
eased one reads as a dissolve.

During playback the cycle walks *from* the palette you chose, and choosing one restarts the cycle
from it. Otherwise the sequence is decided purely by elapsed time and your pick is discarded.

## Effects

Glitch, bloom, chromatic aberration and a vignette, grouped with the grain because they all act on
the finished piece rather than on how it was made. Canvas state, so no generator knows they exist.

Static is broadcast interference: turbulence drawn out into horizontal streaks — low frequency
across, high down — then crushed to a few discrete levels, because smooth turbulence reads as haze
and hard steps read as a signal breaking up.

It interrupts rather than sits there. Constant static stops reading as interference and becomes
texture, so time is chopped into slots, only some fire, and the ones that do cut hard in and out at
varying strength. `Burst` at 0 leaves it on permanently; higher makes the interruptions rarer and
shorter. Slot zero always fires, so a piece that has never been played still shows what the slider
is doing. When it's off no node is emitted at all.

Glitch is horizontal slice displacement — the scanline tear. Turbulence stretched almost flat
across and steep down varies only by row; quantising it to a handful of discrete levels turns a
smooth gradient into hard bands, which is the difference between a warp and a tear. A displacement
channel is centred at 0.5, so holding green there keeps the offset purely horizontal and slices
slide sideways without drifting.

Bloom and aberration filter the **artwork group only, never the background rect**. That distinction
is the whole reason aberration works: splitting a filled background into colour channels and
screen-blending it back wrecks the paper, whereas splitting shapes over a transparent backdrop
reconstructs them exactly *except* at the edges — which is the fringe you want.

Bloom thresholds before it blurs. Without that it smudges everything instead of making bright
things bleed.

A filter rasterises its group once and then works on pixels, so the cost scales with canvas area
rather than element count — a 26,000-dot attractor filters no slower than a 16-band strata. It is
not free though: PNG export went from about 440ms to 1.2s with bloom on.

Same raster caveat as the grain: these survive PNG export and any renderer that understands
filters, and a pen plotter ignores them.

## Grain

A turbulence layer over the finished piece — the tooth of the paper rather than anything the
generator drew. Like the aspect ratio it's canvas state, so generators stay pure and never see it.
Its filter seed derives from the piece's seed, so the grain is part of the piece and reproduces
with it.

**It is a raster effect, and that matters here.** The exported SVG carries the filter instruction,
and anything that understands filters — a browser, Illustrator — applies it. A pen plotter does
not: it will draw the clean geometry underneath and the grain simply won't exist. Verified that it
does survive PNG export (flat paper goes from 1 tone to 13), which is the case that could have
silently failed.

Noise is incompressible, so grain inflates a PNG roughly 10–20x — measured 1.13MB to 22MB at 4x.
The export panel warns at large sizes. SVG is unaffected, since the filter is a few lines of
markup whatever the amount.

With grain at 0 no filter is emitted at all, so a piece without it exports exactly as it did
before grain existed.

## Showcase mode

Press play and the piece animates: several params modulate on independent waves, and the palette
cross-fades between sets. **Present** fills the screen with no interface, for screen recording.
Space toggles play, Escape leaves.

Pausing keeps what's on screen. The live values are written into the params
before the clock stops, so the paused frame is a piece in its own right —
sliders, permalink and canvas all agreeing, ready to adjust or export. Without
that, pausing dropped back to the base params and the piece visibly jumped.

The one thing that can't be captured exactly is the palette: a cycling piece
shows a blend of two sets, and a blend has no id to put in a param or a link,
so pausing snaps to whichever it's nearer.

Frozen values are deliberately not rounded at all. Snapping them to slider steps shifted the piece
off the frame being paused on, in all fifteen pieces, which is why `coerce` grew a `snap` option.
Rounding to even 5 decimals is no better: the attractor iterates a chaotic map 26,000 times, and a
1e-5 change in its constants moved points by 956 units. Full precision makes a paused permalink
longer — about 221 characters of params against 153 at the defaults — and it also makes it exact.

There's no restart, deliberately. The modulators are endless periodic waves, so `t=0` is an
arbitrary phase rather than a beginning — and reloading the page already gives a reproducible
start, since time begins at zero and the seed comes from the URL.

The constraint that shapes all of this: generators consume the rng **in sequence**, so a param that
changes *how much* randomness is drawn reshuffles the piece rather than moving it. Modulating one
of those flickers. Every range param was swept and checked for shape-count stability across frames;
the ones that reshuffle carry `structural: true` in their schema and the showcase UI won't offer
them. That's why `pathCount`, `grid`, `squareness` and `iterations` aren't animatable while almost
everything else is.

Per-frame change was calibrated against known bounds — a still frame scores 0, re-seeding every
frame scores 0.575. Roughly 0.01–0.05 reads as filmic, ~0.10 as energetic breathing, 0.18+ as
churn. The shipped presets sit around 0.02–0.03.

Two things worth knowing:

Modulated values are deliberately **not** snapped to each param's `step`. Step exists so sliders
feel right; snapping during playback holds a param still for several frames then jumps it, which
reads as judder — measured as a median per-frame change of exactly zero with all the movement
arriving in spikes.

Eight pieces were designed for showcase rather than adapted to it — **moiré**, **harmonograph**,
**attractor**, **strata**, **halftone**, **contour**, **chladni**, **lens**, **blocks**, **packing**, **rosette**, **glyphs**, **cells** and **phyllotaxis**.
The trick is to spend the rng entirely up front, on a noise field or a set of pendulum ratios, and
have every param after that transform fixed geometry. Both end up with 10 of their range params
animatable, the strongest motion of any piece, and 2-5ms generation.

**Differential growth is the expensive one.** It's the only piece that simulates rather than
places, so its cost is generations x nodes rather than output size, and profiling put about 80% of
that in the repulsion scan — roughly 96 million distance checks at the old defaults.

Three things brought ~300ms down to ~125ms. Typed arrays and a counting-sort grid in place of a
Map of arrays gave 1.13x with the output byte-identical. Cheaper defaults (150 generations, 2400
nodes) gave the rest; the form comes out about 83% of its former size, and because permalinks
encode every param explicitly, no existing link is affected — the old settings on the new code
still produce the old piece exactly.

It still can't play live at 8fps. What it can do now is not block the interface: the generator is
marked `heavy`, and a heavy generator's canvas updates at most every 140ms while a control is
dragged. The slider still moves immediately; only the render waits.
Subdivision plays fine but animates mostly through colour and stroke weight, since nearly all of
its geometric params reshuffle.

## Layout

```
src/
  core/
    rng.js         seeded PRNG — xmur3 over mulberry32, plus speakable seeds
    noise.js       seeded 2D simplex + fBm
    ratios.js      canvas shapes at constant area
    simplify.js    deviation-bounded polyline simplification
    grain.js       paper-grain overlay (raster)
    effects.js     bloom, chromatic aberration, vignette (raster)
    showcase.js    time-based param modulation
    palettes.js    named colour sets, ordered quiet -> loud
    params.js      schema defaults, coercion, clamping
    permalink.js   hash encode/decode
    export.js      SVG serialisation and PNG rasterising
  generators/
    index.js       the registry — add a line here
    subdivision.js
    flowField.js
    truchet.js
    growth.js
    moire.js
    harmonograph.js
    attractor.js
    strata.js
    halftone.js
    contour.js
    chladni.js
    lens.js
    blocks.js
    packing.js
    rosette.js
    glyphs.js
    cells.js
    phyllotaxis.js
  components/
    SvgStage.vue   viewBox + background; delegates to SvgNode
    SvgNode.vue    recursive { tag, attrs, children } renderer
    ControlPanel.vue / ParamControl.vue   built from the schema
    Toolbar.vue    generator picker, seed field, re-roll, reset
    ExportBar.vue  SVG / PNG download
    EffectsBar.vue   bloom / aberration / vignette / grain
    ShowcaseBar.vue  playback, speed, intensity, present
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

Truchet shows the third lever: thousands of tiles share the same handful of paint attributes, so
they're grouped into a `<g>` per colour-and-width and the children carry only `d`. That's a 56%
cut in markup for free, and it's what the scene contract's `children` is for.

Differential growth is the exception to all of this: it's a simulation, so its cost is
generations x nodes rather than output size. It's the slowest piece by an order of magnitude
(~300ms at the defaults against 14ms for flow field), and dragging its sliders lags accordingly.
Generations and node budget are capped as a product for that reason.

A generator wanting tens of thousands of *elements* would still want a different surface.

Palettes run quiet → loud, which suits filled areas: the dominant colour sits nearest the paper.
Line work wants the opposite, so flow field reads the weighting from the loud end — thin strokes
in the quietest colour vanish against the background.

Not built yet, and nothing here precludes them: a favourites strip, an animated mode.
