# gen-art-1

**Every Pause a Masterpiece.**

A generative art gallery in Vue 3. Pieces are SVG, seeded, and shareable as a URL.

![Three pieces side by side: a recursive subdivision in orange and blue, a five-rooted dendrite on
cream, and an amber flow field on near-black](docs/pieces/hero.png)

```bash
npm install
npm run dev    # studio
netlify dev    # studio plus link previews
```

Twenty generators, seventy-five palettes, seven canvas shapes, five frames and six rooms.

## The idea

A generator is a **pure function of `(params, rng)` that returns a scene description**. It never
touches the DOM, never calls `Math.random`, and knows nothing about Vue:

```js
generate({ params, rng, width, height, palette }) {
  return { width, height, background: '#f4eed2', shapes: [ { tag, attrs, children } ] }
}
```

Everything else follows. The stage is a dumb renderer of `{ tag, attrs, children }`, so generators
emit any SVG element — groups, clip paths, gradients — without the renderer learning what any of
them mean. Output is real DOM: inspectable in devtools, copyable straight out as vector. Generation
is pure with a freshly seeded rng each run, so a seed reproduces a piece exactly.

![The studio: a sidebar of schema-built controls and palette swatches on the left, a truchet piece
filling the stage on the right, and a tray of actions under it](docs/pieces/studio.jpg)

Nothing in that sidebar is written by hand. The piece picker, the shape, the seed field and every
slider under it are read off the schema, so the panel is the same amount of work for a generator
with four params as for one with fourteen.

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
    { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'dusk' },
  ],
  generate({ params, rng, width, height, palette }) { /* ... */ },
}
```

Then add one line to `src/generators/index.js`. Controls, seeding, URL state and validation all come
from the schema.

Param types are `range`, `select`, `palette`, `color` and `toggle`. A new one means one branch in
`ParamControl.vue` and one in `coerce()` in `core/params.js`, and nowhere else.

A `range` may also carry `structural: true` — it decides how much work ends up on the page — and
`wander`, how far a random roll may take it from its default.

## Opening on nothing

A visit with no query string names no piece, so the site opens on a panel of all twenty rather than
dropping into whichever generator is first. Each card is generated, never stored: the thumbnail
**is** the piece clicking it opens, on a seed derived from the generator's id.

![A five-by-four grid of all twenty generators, each a square piece in its own
palette](docs/pieces/panel.png)

The palette is rolled per visit, so the panel is a different set of colourways each time it opens.
The grid above is each generator's authored palette, which is what makes it reproducible here.

Thumbnails build one per animation frame — together about 280ms, enough to freeze the panel if done
in one pass — and each goes into an `<img>` as a blob URL. Twenty inline documents would put twenty
sets of clip-path ids in one namespace and cost about two megabytes of live DOM; the twenty pieces'
markup at their defaults sums to 1.94MB.

Behind the panel a real generator plays on a real showcase preset, picked at random with a random
palette. A backdrop has to reach the edges, so only the cheap allover fields qualify — subdivision,
strata, cells, packing and truchet, which mark 50–99% of the left and right sevenths and cost
0.1–2.4ms a frame. Attractor, rosette, phyllotaxis, harmonograph and dendrite measure 0% there:
they compose a single figure in the middle. Margin is forced to zero and any `margin` modulator
dropped, or the piece keeps a breathing border of its own background colour. The canvas is shaped
to the window at constant area, and a resize regenerates it once the drag stops.

It runs at half the preset's speed, on authored defaults rather than a roll that could land on a
dud, and `prefers-reduced-motion` holds it on a single frame. Frosted glass covers the whole screen
at 13px of blur — past about 20px the finer pieces dissolve into a gradient and there is no movement
left to see. The stacking order is explicit, backdrop 0, frost 1, sheet 2, because a `::before`
counts as its element's first child and at an equal `z-index` the artwork paints on top of the frost.
The tint sits above the frost rather than under the artwork, which holds the screen to roughly one
brightness across all seventy-five palettes.

While the panel is up the address bar stays bare, because the URL is what decides the panel is
there. Choosing pushes a history entry, so Back returns to it. The wordmark and the grid button in
the sidebar both push the bare URL to come back.

**Start From Randomized Piece** rolls generator, canvas shape and every parameter from one
word-seed, on an rng namespaced apart from the one the art draws on.

Rolling every param uniformly is worse than it sounds: each lands near an extreme about as often as
anywhere else, and one or two at a time — a margin at 140, a count at its minimum, opacity at 0.05 —
is enough to come out blank. A range param is drawn from a window centred on its authored default,
`wander` wide as a fraction of its range, slid back inside the bounds rather than clipped against
them. Pieces whose params decide whether there is a figure at all — a chaotic map's four constants,
the golden angle a phyllotaxis packs at, a line width reaching zero — declare a tighter `wander`
beside the param it protects. Measured over 1,080 rolls each, rasterised and counted blank below 2%
ink: **10.6% uniform, 4.4% with the windows**, and most of what remains is sparse rather than empty.

## Seeds and permalinks

Seeds are words — `wayward-kandinsky-42` — so they survive being read aloud or skimmed in a URL. A
descriptor, a painter and a number, all ASCII and single-word. The full state lives in the query
string:

```
?g=subdivision&r=square&s=wayward-kandinsky-42&p=maxDepth:6,splitChance:0.88,palette:flame,…
```

Readable and hand-editable on purpose. Every param is written out, including ones at their default,
so a link keeps rendering the same piece even if a default is retuned. Anything invalid — an
out-of-range number, an unknown palette, broken percent-encoding — is clamped or defaulted by
`coerce()` rather than producing a blank stage. A link with no `r` resolves to square.

**`w=<frameId>`** is the one optional field, and the only one that is a *view* rather than part of
the piece: it means "open this in the gallery, in this frame". Its absence means the studio. It is
written last and omitted entirely rather than written empty, so an ordinary piece link is
byte-identical to any other and the field says something by existing at all.

Nothing on arrival rolls anything. `applyState()` writes what the link says and stops there; a link
that rerolled itself on arrival is not a link. Rolling happens only where you press — a palette
swatch, which rolls the background against the new set; **Re-gen**; and **Randomized piece**. The
piece picker is not one of them: it drops to the new generator's defaults and carries the palette
across.

**Re-gen** rolls the piece, not just the seed. A new seed alone only reshuffles what the generator
draws from the same numbers, so it rolls every param too. The palette is held, and held properly: it
is handed to `randomParams` rather than stamped over the top afterwards, because colour params are
drawn *from* the set. Generator and shape are held as well — changing those is what the picker and
Randomized piece are for. The roll comes off the new seed rather than `Math.random`, so it is a
function of a seed like everything else here; typing a seed back into the field sets the seed and
leaves the params alone, because the permalink is what carries a piece.

Discrete choices push a history entry, so Back walks through the pieces you looked at. Slider drags
replace instead, so one gesture doesn't bury the history.

## Link previews

Paste a link anywhere that unfurls URLs and the preview is the piece that link points at. There is
no database and no stored image: a permalink carries every parameter and generators are pure, so the
image is re-derived from the URL on request. Two pieces, both under `netlify/`:

- **`functions/og.mjs`** serves `/og?<the same query>`, resolving the state, rendering through
  `core/svg.js` — a string serialiser, no DOM — and rasterising with `@resvg/resvg-wasm`. The piece
  is letterboxed into 1200×630 against its own background colour, so every ratio gives one card
  shape without cropping. 20–240ms depending on the piece, cached `immutable`.
- **`edge-functions/share.js`** rewrites the `SHARE-META` block in `index.html` as it goes past,
  filling in `og:title`, `og:description`, `og:url`, `og:image` and the Twitter equivalents. It only
  needs the words, so it calls `previewMeta()` and never generates art. Any failure falls through to
  the static tags, so this layer cannot take the page down.

Effects and grain are left out of the preview image: they are SVG filters and resvg's filter support
is partial, so including them would produce a card that disagreed with the page. Neither function
runs under `npm run dev`; `netlify dev` runs both.

## Getting work out

**SVG** is the real thing. The stage is already vector, so export removes what the app added — Vue's
scoped-style attributes, layout classes — and gives the file an explicit size, which Firefox needs to
rasterise one. The result opens in Illustrator or Inkscape and goes straight to a pen plotter.
Truchet and flow field suit plotting especially well, being stroke-based already.

**PNG** rasterises the same serialised SVG through a canvas at 1–8x; 4x is 4000px, roughly 13 inches
at 300dpi. The scene references no external images or fonts, so the canvas doesn't taint. Anything
past an 8192px edge is clamped.

**CSS** opens a panel holding a rule that uses the piece as a background, with the artwork inlined as
a `data:` URI. Nothing is written to disk and nothing is pushed to the clipboard unasked — the rule
is shown in full and selected on open, so a refused clipboard costs you the button and not the rule.
`background-color` is set to the piece's own background, so the block degrades to the right colour
while the image decodes. `no-repeat`, because nothing here is drawn to tile. Grain and effects come
along, since a data URI is rendered by the browser's own SVG engine.

The encoding is percent-based rather than base64, which inflates by a third and stops the markup
compressing; this leaves it legible and gzips well (attractor: 344KB to 127KB). `#` must be escaped
or the image truncates at a fragment, and `%` has to be escaped before everything else or it escapes
the escapes.

Nine of the twenty pieces come in under 60KB, the median is 76KB, and moiré, dendrite and attractor
run past 200KB — which the panel says out loud before you paste one into a stylesheet. There is
deliberately no inline-PNG mode: this is high-entropy line art, the worst case for PNG. Attractor is
the closest it comes, 344KB of SVG against 413KB of PNG.

Files are named for the piece — `gen-art-truchet-still-hokusai-12.svg` — so a file on disk is
traceable back to the seed that made it.

## On the wall

A piece hung in a real room, opened from **See it on a wall** under the stage.

![A recursive subdivision print in a dark gallery frame, hanging on a slatted timber wall above a
green sofa, daylight from a bay window to the left](docs/pieces/on-the-wall.jpg)

Any room enlarges when clicked, and the arrow keys then walk the rooms with the piece staying put:
one work, six walls, a key apart. Escape closes the enlarged plate before it closes the panel.

`core/mounts.js` holds two independent lists. A **frame** is what surrounds the artwork — Unframed,
Thin, Mounted, Gallery, Wood — and a **room** is a photograph of somewhere it can stand. Every frame
appears in every room, so adding either multiplies rather than adds. The mount is white paper
whatever the piece, because that is what a framer cuts; only the moulding is chosen against the
work. A moulding is four mitred rails, each catching the light on a different face, which reads as a
joined frame at any tone. The hairline where the board is cut is slightly darker than the board,
because a bevel through white paper shows its own shadow.

The framed piece is a separate SVG document handed to an `<img>`. A piece mints clip-path and filter
ids from its own seed, so two framings inlined together would collide — and the stage is left alone,
which matters because export serialises the live stage node. Inside a frame the artwork is clipped
to its own rectangle: bloom, aberration and glitch have filter regions reaching well past the shapes
they filter, and an unclipped mat measures 11,523 pixels of spill. Clipping stays off by default in
the serialiser and frames opt in, because most pieces draw something outside their own bounds and
turning it on everywhere would recrop sixteen of the twenty link previews.

Every plate is shown in the shortest photograph's shape, derived rather than written down, so a room
added tomorrow either fits it or changes it. The crop is a window, not a resize: the piece is placed
as a fraction of the *photograph*, so the photograph keeps its own box inside that window and the box
is what hangs the work. Each `<img>` carries the photograph's own `width` and `height`, so the
browser reserves the box before a byte is fetched, and the reserved box is tinted its room's wall
colour. A room is `RoomPlate.vue` rather than markup, because enlarging puts the same room on screen
twice and each plate has to measure itself.

### Making it sit in the room

A correctly placed rectangle reads as a sticker. What makes it an object is light falling on it and
the room coming back out of its glass. Six layers, all sized in container-query units:

- **A shadow in two parts** — a wide soft one for ambient light, and a tight dark one where the frame
  meets the plaster. The second is what the eye reads as contact rather than glow.
- **A lit edge.** An inset shadow offset toward the light leaves a bright hairline on two sides and a
  dark one on the other two. Thin on purpose: past about a third of a percent it becomes a border.
- **A sheen and an ambient falloff** in one gradient layer, both at the same angle — CSS puts a
  gradient's 0% stop at the start of the line, not where the angle points, so opposing them puts the
  highlight on the dark corner.
- **A breath of the wall's own colour** over the work, because a print in a room is lit by that room.
- **The room reflected in the glazing** — two soft upright bands on the window side, which is what a
  window with a mullion leaves on a framed print. This is the layer that lands *on* the artwork.
- **The mat's shadow on the print**, on the *lit* side: what blocks the light is the near wall of a
  recess.

Light and wall tone live on the room definition, measured from each photograph by script rather than
by eye — the clean wall found by scanning rows for the longest unbroken run of wall colour, the light
by comparing the wall's left quarter against its right and checking that against the fall either side
of something standing in the room. Diffuse surfaces only: a gloss chair reads backwards, because that
is a specular highlight and not shading.

### Flat and angled walls

The room cannot join the SVG document — an SVG in an `<img>` may not load anything external — so the
room is a plain `<img>` with the framed piece laid over it in HTML, placed as fractions of the
photograph so it holds at any size.

A **flat-on** wall needs only a scale and a translate: give it an `area`. A wall shot **at an angle**
carries a `plane`, the homography from the wall's own isotropic coordinates to fractions of the
photograph, which is the one thing CSS can do here that SVG cannot — SVG transforms are affine,
`matrix3d` is not.

The slatted wall shows how to measure one. Evenly spaced slats fit the projective map
`x(u) = (au + b)/(cu + 1)` exactly — 45 of them to a mean of 0.86px — and that map *is* the wall's
perspective. The panel's top edge gives the second row of the matrix. Two perpendicular vanishing
points give the focal length, 2153px or 1.62× the frame, and from it the foreshortening: 40.3° off
the image plane, one unit of height to 55 slats of width. Verticals stay vertical on a wall shot
with a level camera, so vertical scale at any point is simply its distance from the horizon; only
the receding direction is squared. The map is a true homography only when the horizon equals y at
the vanishing point, which the slat fit and the top edge agree on independently — that agreement is
the check worth reproducing for any wall added this way.

The steel wall has nothing evenly spaced to fit, and is assembled from what the photograph does
have. The panel seam holds x 590–598 over 1200px of height, so the camera is level. The base line
fits to a mean of 5.6px once sunlight on the floor is kept out of the search. The horizon comes from
the sunlight itself: a streak on the floor has two parallel edges, which converge on the horizon, and
a constant real width, so its image width grows in proportion to distance below the horizon. Both
put it at y 947. Its foreshortening is the one quantity assumed rather than measured — it borrows the
slatted wall's 1.6× frame width, and the render is the check.

Flat or angled is a measurement, not a glance. The limewash wall looks like the slatted one and is
not: its board gaps sit at the same x read high or low, drifting under 10px over 700px of height, and
their pitch wanders — 232, 236, 240, 233, 247 — without converging. That is reclaimed boards of
different widths, so it takes an `area` and no plane.

The two angled walls disagree about which way `v` runs — up from the floor on one, down from the
ceiling on the other — so `placeOnPlane` orders its corners by where they land rather than by the
order it generated them; taken positionally the two conventions differ by a vertical flip.

Only `steel` carries a `beam`. `beamOver()` fits an affine approximation of distance-from-beam across
the piece's four corners, which is fine for shallow quads; a wall shot at a hard angle would need the
inverse homography.

Attribution lives in the room definition rather than on the page, so a room cannot be added without
its credit.

## Canvas shapes

Seven ratios, from square to 16:9, and both A-series orientations. They hold **area** constant rather
than a fixed edge, so a margin of 30 or a grid of 12 means the same density of work whatever the
shape.

![One truchet piece at three ratios — 16:9, square and A-series portrait — drawn at a single scale,
the three rectangles visibly covering the same area](docs/pieces/shapes.png)

Those are one piece on one seed at three shapes, drawn at a single scale: the tiles are the same size
in all three and only the field they fill changes. Square lands on exactly 1000×1000, and 1:√2 lands
on 1189×841, which is A0 in millimetres, so an export scales to any A size exactly.

Changing shape re-runs `generate()` on the new canvas with the same seed. The piece is regenerated,
not reflowed.

## Palettes

Seventy-five sets, **every one picked from Coolors**, shown as swatches rather than named in a
dropdown — the choice is the look, so it should be visible. The rule is provenance rather than a
score: measuring a palette tells you whether it is dull, not whether it is good. No two sets share
three or more colours, and none are near-identical by mean nearest-colour distance. Each of the
twenty generators has a different default, assigned by nearest set in CIE Lab with the background
weighted 1.6x, so the opening grid does not read as one colour.

**Palette use** is separate from which palette, and sits beside it:

- **Background** — the paper can be the palette's own, any of its five colours, or neutral paper/ink
- **Inks** — click any colour to mute it; muting everything falls back to the full set
- **Order** — rotate which colour dominates, or flip the quiet-to-loud ordering

`bg` indexes the palette's *original* colours, so the swatch you click is the colour you get whatever
muting and rotation are doing to the ink order. Treatment is canvas state like the shape and the
grain, so it applies to whatever piece is on screen and composes with showcase's palette cycling.

Colour changes ease rather than cut — a 600ms CSS transition on `fill`, `stroke` and their opacities,
which work because presentation attributes act as low-priority CSS declarations. Deliberately not
`stroke-width` or geometry: those are modulated every frame during playback and easing them would lag
the motion. Neither `fill` nor `stroke` is compositor-accelerated, so a switch repaints every
affected element — up to around 2000 on a maxed flow field. `prefers-reduced-motion` disables it.

Palettes run quiet → loud, which suits filled areas: the dominant colour sits nearest the paper. Line
work wants the opposite, so flow field reads the weighting from the loud end.

## Effects and grain

Glitch, bloom, chromatic aberration, a vignette and scanlines, grouped with the grain because they
all act on the finished piece rather than on how it was made. Canvas state, so no generator knows
they exist.

Scanlines are a **tiled pattern**, not a filter — lines are a shape, and a shape is a pattern.
`patternUnits` is `userSpaceOnUse`, so `Line gap` is in the piece's own coordinates and the same
number gives the same density whatever the canvas shape. The dark band is half the pitch. Three of
the four blends are black and one is white; screened black and differenced black are both the
identity, so offering them would put entries in the menu that changed nothing.

Glitch is horizontal slice displacement. Turbulence stretched almost flat across and steep down
varies only by row, and quantising it to a handful of discrete levels turns a smooth gradient into
hard bands — the difference between a warp and a tear. A displacement channel is centred at 0.5, so
holding green there keeps slices sliding sideways without drifting.

Bloom and aberration filter the **artwork group only, never the background rect**, which is the whole
reason aberration works: splitting a filled background into colour channels and screen-blending it
back wrecks the paper, whereas splitting shapes over a transparent backdrop reconstructs them exactly
except at the edges — which is the fringe you want. Bloom thresholds before it blurs, or it smudges
everything instead of making bright things bleed.

A filter rasterises its group once and then works on pixels, so cost scales with canvas area rather
than element count: a 26,000-dot attractor filters no slower than a 16-band strata. Not free, though
— PNG export goes from about 440ms to 1.2s with bloom on.

**Grain** is a turbulence layer over the finished piece — the tooth of the paper. Its filter seed
derives from the piece's seed, so the grain is part of the piece and reproduces with it. At 0 no
filter is emitted at all.

Both are **raster effects**, and that matters. The exported SVG carries the filter instruction and
anything that understands filters applies it; a pen plotter draws the clean geometry underneath and
the grain simply won't exist. Grain survives PNG export — flat paper goes from 1 tone to 13 — and
noise is incompressible, so it inflates a PNG roughly 10–20x, measured 1.13MB to 22MB at 4x. SVG is
unaffected. The export panel warns at large sizes.

## Showcase mode

Press play and the piece animates: several params modulate on independent waves and the palette
cross-fades between sets. **Present** fills the screen with no interface, for screen recording. Space
toggles play, Escape leaves.

Pausing keeps what's on screen. The live values are written into the params before the clock stops,
so the paused frame is a piece in its own right — sliders, permalink and canvas all agreeing. Frozen
values are not rounded at all: snapping them to slider steps shifts the piece off the frame you
paused on, and even 5 decimals is too coarse, since the attractor iterates a chaotic map 26,000 times
and a 1e-5 change in its constants moves points by 956 units. Full precision makes a paused permalink
longer — about 221 characters of params against 153 at the defaults — and exact. The palette is the one
thing that can't be captured: a cycling piece shows a blend of two sets, and a blend has no id, so
pausing snaps to whichever it's nearer.

Playback **eases in** over 1.5s from whatever is already on screen, so the first frame of playback is
byte-identical to the still frame before it. 1.5s because the biggest jumps need the room — truchet's
worst single frame during the ease drops from 0.194 to 0.133 between 0.8s and 1.5s — and past about
2s it stops helping and only feels slow.

There is no restart. The modulators are endless periodic waves, so `t=0` is an arbitrary phase rather
than a beginning, and reloading already gives a reproducible start.

The constraint that shapes all of this: generators consume the rng **in sequence**, so a param that
changes *how much* randomness is drawn reshuffles the piece rather than moving it. Those carry
`structural: true` and the showcase UI won't offer them — which is why `pathCount`, `grid`,
`squareness` and `iterations` aren't animatable while almost everything else is. Modulated values are
also not snapped to each param's `step`: snapping holds a param still for several frames then jumps
it, which reads as judder.

Per-frame change is calibrated against known bounds — a still frame scores 0, re-seeding every frame
scores 0.575. Roughly 0.01–0.05 reads as filmic, ~0.10 as energetic breathing, 0.18+ as churn. The
shipped presets sit around 0.02–0.03. Measured live frame rates in a foreground tab: truchet,
attractor and cells at 60fps; moire 40; flow field 25.

Most pieces are designed for showcase rather than adapted to it. The trick is to spend the rng
entirely up front, on a noise field or a set of pendulum ratios, and have every param after that
transform fixed geometry — which gives most of their range params animatable and 2–5ms generation.

**The Penrose tiling can't be animated, and is anyway.** Deflation has no continuous knob, so there
is exactly one tiling and no way to deform it. The motion is the surface instead: a travelling wave
turns each rhomb about its own centre and opens the grout around it. The swell is cubed, which holds
most tiles flush and concentrates movement into a narrow crest crossing an intact pattern; a plain
sine disturbs every tile all of the time and the pattern stops reading as a tiling. No tile is ever
added or dropped, only turned.

**Dendrite has a budget.** A full tree is `branches^depth` wide — 4 splits at depth 11 is four million
segments — so the total is capped at 14,000 and depth gives way. Those segments batch into one path
per depth-and-ink, a few dozen elements rather than fourteen thousand. It generates in about 6ms and
sweeps at 2.51px of movement per frame at 30fps, with the shape count constant across all 300 frames
checked.

Subdivision plays fine but animates mostly through colour and stroke weight, since nearly all of its
geometric params reshuffle.

## Operate on a desktop, browse anywhere

Operating wants a desktop — twenty generators, a hundred-odd sliders, export. Looking does not, and a
link from here is opened on a phone more often than anywhere else, so the one thing that must not
break is seeing the piece.

![The studio at phone width: no sidebar, a line reading "Browsing. The controls, effects and export
are on a desktop", the dendrite upright and full-bleed, and a tray of four
actions](docs/pieces/narrow.png)

Under **700px** the sidebar goes and what is left is the whole of the looking: the work full-bleed,
the tray under it — play, re-gen, roll a new piece, see it on a wall — and a line where the sidebar
was saying where the rest lives. The gallery already collapses to one column. In a 404px frame:
single column, artwork 383px, tray on screen, no scrolling in either axis.

The narrow header is a second element rather than the sidebar's reflowed, and exactly one of the two
is ever displayed, so the wordmark is never on screen twice or in the accessibility tree twice.

**The media query sits last in the stylesheet**, which is not tidiness. At equal specificity the later
rule wins; placed beside the `.app` rules where it reads best, its `display: none` loses to the
`.sidebar` rule further down and the sidebar stays up.

Below 700px the app reaches for **portrait** wherever it is choosing a shape for itself: the first
piece of a bare visit, the twenty cards in the picker, and a roll. Otherwise a phone gets a 16:9 as
often as anything else — a letterbox in a column. 2:3 rather than 1:√2 because a phone viewport is
nearer 1:2 than either, and the taller of the two wastes less.

A link that names a shape is obeyed on any screen. The permalink is the piece, and a phone
reshaping someone's composition on arrival would be the same bug as rerolling it.

The cards change shape with it, rather than staying square and opening something else — a card is
the piece clicking it opens, and that promise is worth more than a uniform grid. The palette roll
sits outside the shape for the same reason the cards are regenerated and not restretched: crossing
the breakpoint reshapes twenty pieces, and rolling colour there would recolour them as a side
effect. The narrow grid is two columns, stated rather than fitted, because `auto-fill` at 168px
drops to one on a 390px phone and one column of upright cards is 9,400px of scrolling.

On a roll the shape is overridden *after* the draw rather than in place of it: `randomState` draws
the generator, then the shape, then every param from one seeded sequence, so skipping the shape draw
shifts the sequence and the same word-seed would roll different art on a phone than on a desktop.
The draw still happens and its result is discarded. Only the shape is pinned — twenty-five narrow
rolls come back portrait every time and still draw sixteen different generators between them. The
breakpoint is watched rather than read once, so a phone turned on its side crosses it.

## Layout

```
src/
  App.vue          the shell: stage, sidebar, tray, and the one media query
  core/
    rng.js         seeded PRNG — xmur3 over mulberry32, plus speakable seeds
    noise.js       seeded 2D simplex + fBm
    ratios.js      canvas shapes at constant area
    simplify.js    deviation-bounded polyline simplification
    grain.js       paper-grain overlay (raster)
    effects.js     bloom, aberration, vignette, glitch, scanlines (raster)
    showcase.js    time-based param modulation
    palettes.js    named colour sets, ordered quiet -> loud
    params.js      schema defaults, coercion, clamping
    random.js      a whole piece by chance — generator, shape, every param
    permalink.js   query-string encode/decode
    export.js      SVG serialisation and PNG rasterising
    css.js         a piece as a CSS background rule, inlined as a data URI
    svg.js         scene tree to an SVG string, with no DOM
    preview.js     a piece rebuilt from nothing but its URL
    launch.js      what the opening panel offers, and what may play behind it
    mounts.js      frames, rooms, and the projection that hangs one in the other
  generators/
    index.js       the registry — add a line here
    subdivision.js  flowField.js  truchet.js    dendrite.js   moire.js
    harmonograph.js attractor.js  strata.js     halftone.js   contour.js
    cove.js         chladni.js    lens.js       blocks.js     packing.js
    penrose.js      rosette.js    glyphs.js     cells.js      phyllotaxis.js
  components/
    SvgStage.vue     viewBox + background; delegates to SvgNode
    SvgNode.vue      recursive { tag, attrs, children } renderer
    ControlPanel.vue / ParamControl.vue   built from the schema
    Toolbar.vue      piece picker, shape, seed field, re-gen, reset
    PaletteBar.vue   paper, ink order, and which colours are in play
    ExportBar.vue    SVG / PNG / CSS
    EffectsBar.vue   bloom / aberration / vignette / glitch / scanlines / grain
    ShowcaseBar.vue  playback, speed, intensity, present
    LaunchPanel.vue / LaunchBackdrop.vue  the front door and the piece behind it
    GalleryPanel.vue / RoomPlate.vue / FrameChoice.vue   on the wall
    AboutPanel.vue   what this is, how to print it, colophon
    GenArtMark.vue / JhMonogram.vue / ButtonIcon.vue   marks and glyphs
  composables/
    useGenerator.js  generator + seed + params -> scene
    usePermalink.js  two-way URL sync
    useShowcase.js   the playback clock
netlify/
  functions/og.mjs         the piece a shared link points at, as a PNG
  edge-functions/share.js  rewrites the meta tags as index.html goes past
scripts/
  readmeShots.mjs          regenerates the artwork sheets in docs/pieces/
```

## Notes

Pieces are authored in a fixed 1000×1000 space and scaled by CSS, so a seed looks the same on any
screen and the output is resolution-independent.

Two different costs get conflated as "SVG is slow", and they have different fixes.

**Node count.** Subdivision's worst case is 1254 elements — a depth-9 binary tree caps at 512 leaves
— well inside what SVG handles. Flow field is cheaper than it looks: each traced curve is a single
`<path>`, so 650 curves is 650 nodes, not 650 × its length.

**Path data.** This is what bites on line work. Flow field rounds to 1dp and simplifies with a
deviation bound of 0.6 units — sub-pixel at a 1000px display — which cuts markup by about 40% with no
visible change. Truchet shows the third lever: thousands of tiles share the same paint attributes, so
they group into a `<g>` per colour-and-width with children carrying only `d`, a 56% cut for free.
That is what the scene contract's `children` is for. Dendrite leans on it hardest, and its ~307KB of
path data is the most of any piece — about 8ms to write into the live DOM, which is why markup size
rather than element count is what this surface eventually runs into.

A generator wanting tens of thousands of *elements* would want a different surface.

The images in this file are real pieces. `scripts/readmeShots.mjs` runs the generators through the
same DOM-free serialiser the link previews use and rasterises with the same `@resvg/resvg-wasm`, one
tile per generator at its authored defaults on the seed the opening panel derives from its id. Each
tile is clipped to its own rectangle, because ten of the twenty pieces draw past their own bounds and
a composed sheet has no viewBox edge to hide that. The three screenshots are the running app, which
is the only way to get a `matrix3d` projection onto a photograph and a media query.

Not built yet, and nothing here precludes them: a favourites strip, an animated mode.
