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

A `range` may also carry `structural: true`, meaning it decides how much work ends up on the page,
and `wander`, how far a random roll may take it from its default — both are read by the randomiser
described under *Opening on nothing*.

## Opening on nothing

A visit with no query string names no piece, so rather than dropping into whichever generator
happens to be first, the site opens on a panel of all eighteen. Each card is generated, never
stored: the thumbnail **is** the piece clicking it opens — same seed, same defaults — so the grid
can't promise something the studio then fails to deliver. Each card's seed is derived from the
generator's id, which keeps it the same on every visit without a list of hand-picked seeds to
maintain.

Thumbnails are built one per animation frame. Together they cost around 280ms, and a single piece
can be most of that, so built in one pass the panel would be frozen before it appeared; a frame at
a time, the browser paints between pieces and the grid visibly fills in. Each goes into an `<img>`
as a blob URL rather than inline SVG — the browser rasterises it once, and eighteen inline
documents would mean eighteen sets of clip-path ids sharing one namespace and about two megabytes
of live DOM for a screen of thumbnails.

**Randomize piece** rolls everything: generator, canvas shape, every parameter. The whole choice
derives from one word-seed, so a roll is reproducible from that seed alone, and the rng it draws on
is namespaced apart from the one the art itself draws on.

Rolling every param uniformly is worse than it sounds. Each one lands near an extreme about as
often as anywhere else, and a piece needs only one or two of those at a time — a margin at 140, a
count at its minimum, opacity at 0.05 — to come out blank. So a range param is drawn from a window
centred on its authored default, `wander` wide as a fraction of its range, slid back inside the
bounds rather than clipped against them. Most pieces need no protecting: rolled fully uniform,
fifteen of the eighteen produce something worth looking at essentially every time. The exceptions
are the ones whose params decide whether there is a figure at all — the four constants of a chaotic
map, the golden angle a phyllotaxis packs at, a line width whose range reaches zero — and those
declare a `wander` of their own beside the param it protects, with the reason next to it.

Measured by rasterising 1,080 rolls each and counting the ones that mark less than 2% of the
canvas: **10.6% blank uniform, 4.4% with the windows**, and most of what remains is sparse rather
than empty.

While the panel is up the address bar stays bare, because the URL is what decides the panel is
there — stamping the piece sitting behind it would mean a reload skipped the panel and opened
something nobody chose. Choosing pushes a history entry, so Back comes back to the panel.

## Seeds and permalinks

Seeds are words — `quiet-heron-41` — so they survive being read aloud or skimmed in a URL. The full
state lives in the query string:

```
?g=subdivision&r=square&s=quiet-heron-41&p=maxDepth:6,splitChance:0.88,palette:flame,…
```

Readable and hand-editable on purpose. Every param is written out, including ones still at their
default, so a link keeps rendering the same piece even if a default is retuned later. Anything
invalid — out-of-range numbers, an unknown palette, broken percent-encoding — is clamped or
defaulted by `coerce()` rather than producing a blank stage.

This used to sit after `#`. It moved to `?` so the server can see which piece a link points at,
which is what makes the link previews below possible. Links in the old form are still read, from
the fragment, and rewritten on arrival.

Discrete choices (a new seed, a different generator, reset) push a history entry, so Back walks
through the pieces you looked at. Slider drags replace instead, so one gesture doesn't bury the
history.

## Link previews

Paste a link anywhere that unfurls URLs and the preview is the piece that link points at, not a
generic card. There is no database and no stored image: a permalink carries every parameter, and
generators are pure functions of `(params, seeded rng)`, so the image is re-derived from the URL
on request.

Two pieces, both under `netlify/`:

- **`functions/og.mjs`** serves `/og?<the same query>`. It resolves the state, renders the scene
  through `core/svg.js` — a string serialiser, no DOM — and rasterises with `@resvg/resvg-wasm`.
  The piece is letterboxed into 1200×630 against its own background colour, so every ratio gives
  one card shape without cropping the art. Around 20–240 ms depending on the piece, and cached
  `immutable`, since a different piece is by definition a different URL.
- **`edge-functions/share.js`** rewrites the `SHARE-META` block in `index.html` as it goes past,
  filling in `og:title`, `og:description`, `og:url`, `og:image` and the Twitter equivalents. It
  only needs the words, so it calls `previewMeta()` and never generates art. Any failure falls
  through to the static tags in `index.html`, so this layer can't take the page down.

Effects and grain are left out of the preview image. They are SVG filters and resvg's filter
support is partial, so including them would produce a card that quietly disagreed with the page.

Neither runs under `npm run dev` — Vite serves `index.html` untouched, so local previews show the
fallback tags. `netlify dev` runs both.

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

## Dendrite, and the piece it replaced

Differential growth used to sit in this slot: a closed loop of thousands of nodes pulling on their
ring neighbours and pushing away from anything near them in space, buckling because the perimeter
had nowhere else to go. It made beautiful forms and it was a simulation, ~158,000 node-steps
against a spatial grid, about 130ms a frame. Roughly 8fps in showcase, and inline it blocked paint
and input for half of every second.

It could not be optimised out of that. The repulsion scan was 72% of the cost and ~19 million
distance tests per run, and it looked wasteful — 63% of the nodes it tested were outside the
repulsion radius, because the grid scans a 3x3 box of cells to cover a circle. Tightening the grid
to half-radius cells does cut candidates by 29% and lifts the in-range hit rate from 37% to 51%,
and it makes no difference at all to the runtime: `MAX_NEIGHBOURS` caps how many neighbours a
crowded node samples and fires on 76% of node-steps, so it was already acting as a cost governor.
Shrink the crowd and the sampler just scans a larger fraction of it. Measured end to end, 29% fewer
candidates gave 9% fewer distance tests and a 0.98x change in wall clock. The piece was
cost-bounded by design.

**Dendrite** reaches similar territory — the same branching, space-filling, biological look — by
recursion instead. A branch splits, each piece splits again, the rule never changes and only the
scale it applies at does. There are no neighbours to search and no time to step, so it generates in
about 6ms rather than 130, and it can actually animate: a preset sweep measures 2.51px of movement
per frame at 30fps, squarely in the filmic band, with the shape count constant across all 300
frames checked.

Two things make it behave under animation. Per-node randomness is drawn once up front for the whole
segment budget rather than as the recursion descends, so the number of rng draws never depends on
the dials — the figure never reshuffles mid-sweep — and a node's wobble is tied to its position in
the tree, so raising Depth grows new twigs onto the existing figure instead of drawing a different
one. And the silhouette is measured and fitted after growing rather than predicted before: a limb's
reach is a geometric series, but branches also spread sideways, wobble stretches segments and bow
bends the whole thing, so no closed form exists and every guess either clipped the canopy or left
the piece small. Fitting the real bounding box is exact for every form, and it keeps the
composition still while Shortening and Depth sweep.

### The worker

`heavy: true` on a generator routes it through a worker (`src/workers/scene.worker.js`) instead of
generating inline, with requests coalesced rather than queued and the previous scene held on screen
until the new one lands. Generators were always pure functions of `(params, seeded rng)` that never
touch the DOM, so the same module runs in both places unmodified.

It was built for differential growth and **nothing currently sets the flag** — the slowest piece is
now moire at 23ms, which is fine inline. It is kept as the extension point for any future piece
that simulates, and costs nothing while unused: the worker chunk is only constructed on the first
heavy request.

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
varying strength — about 20% of the time at the default. `Burst` at 0 leaves it on permanently;
higher makes the interruptions rarer and shorter. When it's quiet no node is emitted at all.

The bursts run on **their own clock**, not the showcase one. Driving them from showcase meant they
only ever fired during playback, so a piece sitting still showed static permanently — the opposite
of interference. The clock runs only while static is on and bursting, so a piece without it costs
nothing.

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

Playback **eases in** rather than cutting. Pressing play used to swap the params for the preset's
values in a single frame — up to 58% of a param's range in one step, which reads as a blink. The
motion now ramps from whatever is already on screen over 1.5s, so the first frame of playback is
byte-identical to the still frame it started from, on all eighteen pieces.

1.5s rather than less because the pieces with the biggest jumps need the room: truchet's worst
single frame during the ease drops from 0.194 to 0.133 between 0.8s and 1.5s. Past about 2s it
stops helping and only feels slow — what's left by then is each piece's own motion, not the ease.

Measured live frame rates, once the app was in a foreground tab: truchet, attractor and cells at
60fps; moire 40; flow field 25.

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

**Dendrite is the one with a budget.** A full tree is `branches^depth` wide, so its two structural
dials multiply catastrophically — 4 splits at depth 11 is four million segments. The total is
capped at 14,000 and depth gives way, the same bargain truchet makes with its cell count. Fourteen
thousand segments drawn as individual elements is more than the DOM wants, so they are batched into
one path per depth-and-ink, which is a few dozen elements instead.

It replaced differential growth, which simulated rather than placed and cost ~130ms a frame against
its ~6ms. That story is under "Dendrite, and the piece it replaced" above.

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
    permalink.js   query-string encode/decode
    export.js      SVG serialisation and PNG rasterising
  generators/
    index.js       the registry — add a line here
    subdivision.js
    flowField.js
    truchet.js
    dendrite.js
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
    JhMonogram.vue   shared JH mark
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

Dendrite leans on that grouping hardest: up to fourteen thousand segments collapse into one path
per depth-and-ink, a few dozen elements rather than fourteen thousand. Its ~307KB of path data is
the most of any piece, and writing that much into the live DOM measures about 8ms — worth knowing,
because it means markup size, not element count, is what this surface eventually runs into.

A generator wanting tens of thousands of *elements* would still want a different surface.

Palettes run quiet → loud, which suits filled areas: the dominant colour sits nearest the paper.
Line work wants the opposite, so flow field reads the weighting from the loud end — thin strokes
in the quietest colour vanish against the background.

Not built yet, and nothing here precludes them: a favourites strip, an animated mode.
