# gen-art-1

**Every Pause a Masterpiece.**

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

Behind the panel, a piece plays. It is a real generator on a real showcase preset, picked at
random with a random palette on every visit, not a video and not a canned loop — so the studio has
demonstrated itself before a word of the panel has been read, and it costs nothing to ship.

A backdrop has to reach the edges, which rules most pieces out. Rasterising every one at 16:9 and
measuring ink in the leftmost and rightmost 7% of the frame splits them cleanly: attractor,
rosette, phyllotaxis, harmonograph and dendrite all measure **0%**, because they compose a single
figure in the middle and leave plain background either side. Behind a full-width panel that reads
as a blank screen with something small happening in the centre. Blocks manages 5%, for the same
reason.

What survives is the allover fields, and then only the cheap ones — this regenerates every frame
while the thumbnail grid is still building, and each frame is also a DOM patch, so markup size
counts as much as generation time. Moire covers the frame well but costs 13.6ms and 304KB a frame;
flow field, chladni and contour are both slower and sparser at the edges.

| piece | ink | L/R edges | ms | markup |
| --- | --- | --- | --- | --- |
| subdivision | 99% | 99% | 0.1 | 7KB |
| strata | 99% | 97% | 0.8 | 42KB |
| cells | 71% | 89% | 0.9 | 12KB |
| packing | 53% | 53% | 2.4 | 44KB |
| truchet | 57% | 50% | 0.4 | 62KB |

Margin is forced to zero and any `margin` modulator dropped, or the piece keeps a border of its
own background colour — and truchet's preset sweeps margin between 18 and 102, so that border
would breathe. The canvas is shaped to the window rather than to a fixed 16:9, holding area
constant the way `ratios.js` does for the stage, so the piece is composed for the shape it is
actually shown at instead of being cropped to fit, and a resize regenerates it once the drag
stops.

Authored defaults rather than randomised params, because a full roll can land on a dud and the one
thing this screen must never do is open on an empty canvas. It runs at half the preset's speed:
scenery behind glass shouldn't pull the eye off the panel in front of it, and
`prefers-reduced-motion` holds it on a single frame.

Frosted glass covers the whole screen rather than just the panel, so the piece reads as movement
and colour right across the background instead of only where the sheet overlaps it. Getting the
blur there at all needed an explicit stacking order — a `::before` counts as its element's first
child, so at an equal `z-index` the artwork painted on top of the frost and there was nothing left
behind it to blur. Backdrop 0, frost 1, sheet 2.

13px of blur, not more. Past about 20px the finer pieces — truchet's tiles, a phyllotaxis' dots —
dissolve into a plain gradient and there is no movement left to see, which is the one thing it is
for. The tint sits on top of the frost rather than under the artwork, which is what holds the
screen to roughly one brightness across all fifty palettes, whose backgrounds run from a near-black
laser to an all but white moss.

Everything secondary on this screen uses a brighter grey than the studio's `--ink-dim`. That grey
is tuned for flat panel colour; over frosted artwork it goes muddy.

Thumbnails are built one per animation frame. Together they cost around 280ms, and a single piece
can be most of that, so built in one pass the panel would be frozen before it appeared; a frame at
a time, the browser paints between pieces and the grid visibly fills in. Each goes into an `<img>`
as a blob URL rather than inline SVG — the browser rasterises it once, and eighteen inline
documents would mean eighteen sets of clip-path ids sharing one namespace and about two megabytes
of live DOM for a screen of thumbnails.

The name in the sidebar is a button back to the picker, and there is an explicit **All pieces**
beside the strapline for anyone who does not think to try it. Both push the bare URL rather than
only flipping a flag, because here the URL is what decides whether the picker is up — leaving it
naming a piece would mean a reload skipped the panel and Back stepped past the picker instead of
to it. Before this the only way back was the browser's Back button, which worked only if the picker
happened to be behind you: anyone arriving on a shared link had no way back to it at all.

**Start From Randomized Piece** rolls everything: generator, canvas shape, every parameter. The whole choice
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

Seeds are words — `wayward-kandinsky-42` — so they survive being read aloud or skimmed in a URL.
A descriptor, a painter and a number: the painters run from Hokusai to Sol LeWitt, by way of the
people who first did this on plotters in the sixties — Molnár, Mohr, Nake, Noll. All ASCII and
single-word, because a seed has to be retypable from a URL bar. The full state lives in the query
string:

```
?g=subdivision&r=square&s=wayward-kandinsky-42&p=maxDepth:6,splitChance:0.88,palette:flame,…
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

Files are named for the piece — `gen-art-truchet-still-hokusai-12.svg` — so a file on disk is still
traceable back to the seed that made it.

**CSS** opens a panel holding a rule that uses the piece as a background, with the artwork inlined
as a `data:` URI. Nothing is written to disk and nothing is pushed to the clipboard unasked — the
rule is shown in full, selected on open, and copied with the button or by hand. That is also why it
survives a refused clipboard: an insecure origin or an unfocused window costs you the button, not
the rule, and it says which of the two happened rather than claiming a copy that did not occur.

`background-color` is set to the piece's own background, so the block degrades to the right colour
while the image decodes and stays right if the image is blocked. `no-repeat`, because nothing here
is drawn to tile; repeating a piece shows its seams immediately. Grain and effects come along,
since a data URI is rendered by the browser's own SVG engine, filters and all.

The encoding is percent-based rather than base64 — base64 inflates by a third and stops the markup
compressing, where this leaves it legible and gzips well (attractor: 344KB down to 127KB). Two
characters do the damage if you get them wrong. `#` left raw starts a fragment and the image
silently truncates to nothing, and `%` has to be escaped before everything else or it escapes the
escapes: an early version turned `%22` into `%2522`, which decodes to a literal `%22` and leaves the
markup malformed.

Nine of the twenty pieces come in under 60KB, the median is 76KB, and three — moiré, dendrite,
attractor — run past 200KB, which the panel says out loud before you paste one into a stylesheet.

There is deliberately no inline-PNG mode. It was planned, on the assumption a raster would be
smaller than a few hundred kilobytes of path data, and measurement said otherwise every time: this
is high-entropy line art, the worst case for PNG, and base64 adds a third on top. Attractor is the
closest it comes — 344KB of SVG against 413KB of PNG — and grain makes the gap worse rather than
better, noise being incompressible.

The rule retires when the piece changes. Watching the scene for that looked right and was wrong:
the scene is recomputed every frame of showcase playback, so the panel shut the instant it opened
on anything moving. It watches what actually defines the piece instead — generator, shape, seed,
params, palette use, grain, effects — none of which move while the clock runs, because playback
drives the lived params and only pausing writes them back.

## On the wall

A piece hung in a real room, opened from **See it on a wall** under the stage — it is a question
about the work in front of you, so it is asked where the work is.

Any room **enlarges when clicked**, and the arrow keys then walk the rooms with the piece staying
put, which is the comparison the panel exists for: one work, four walls, a key apart.

The enlarged plate takes the larger of the row it is in and a plate near twice the grid cell,
overflowing and scrolling when the window is too short for that. A portrait photograph in a
landscape window is bound by height long before it is bound by width, so anything fitted to the
viewport came out barely larger than the grid cell it was covering — 430px against 491px, which is
not an enlargement anyone would notice. Seeing the work large is the point of the click, so the
window gives rather than the plate. The arrows are pinned to the window for the same reason: they
stay reachable while a tall plate scrolls past them. Escape closes
the enlarged plate before it closes the panel, so leaving from in there takes two presses. Closing
returns focus to the plate for the room you were *looking at*, found by index, not to the one that
opened the view — after stepping, those are different plates.

Nothing moves while it loads. Each `<img>` carries the photograph's own `width` and `height`, which
is what lets the browser reserve the right box before a byte is fetched — without them a container
has no height until the image decodes, every cell is flat, and the panel jumps when they land. The
reserved box is already tinted its room's wall colour, so the photograph fades up over its own
tone, and the piece follows a beat later: it is a blob URL and paints almost immediately, so left
to itself the work appears first, hanging in an empty rectangle, with the room arriving underneath
it. A cached photograph can also finish before Vue binds the load handler, so the element is asked
directly on mount rather than only listened to.

A room is `RoomPlate.vue`, a component rather than markup, because enlarging puts the same room on
screen twice at once and an angled wall's placement is in pixels. Each plate measures itself; one
width shared by room id would give both whichever was written last. It measures once synchronously
on mount as well as observing, because a `ResizeObserver` is throttled with everything else in a
background tab, and until it delivers an angled room draws no piece at all.

`src/core/mounts.js` holds two lists, because they are two independent choices. A **frame** is what
surrounds the artwork — Unframed, Thin, Mounted, Gallery, Wood — and a **room** is a photograph of
somewhere it can stand. Every frame can appear in every room, so adding either multiplies rather
than adds. Board and moulding colours are chosen against the piece: a white mat around a near-black
work reads as a mistake, and the reverse glows.

Only two of the five carry a mount. Wood is timber straight onto the print, the way Thin is — a
wooden frame is the frame, not a board with a surround around it — so `framed()` takes the mat as
optional and drops both the board and its cut line when there isn't one.

A moulding is drawn as **four mitred rails**, each catching the light on a different face, and that
is deliberate rather than decorative. Mounted and Gallery used to differ only in colour, so on a
dark piece — where the mat was `#1b1b1f` and the moulding `#0b0b0d`, sixteen levels apart out of
255 — switching between them changed nothing you could see. Rails meeting at 45 degrees read as a
joined frame at any tone, which is a difference colour cannot collapse.

The board was the other half of it, and it went through two answers. It was cut to suit the work —
near-black against a dark piece — on the reasoning that white around a near-black print reads as a
mistake. That made Mounted look like extra background and left the moulding nothing to sit against.
Lifting it to a mid charcoal fixed the legibility and was still the wrong idea: **the mount is white
paper whatever the piece**, because that is what a framer cuts, and a dark print on white is the
most ordinary thing hanging in any gallery. Only the moulding is chosen against the work now.

The hairline where the board is cut is slightly *darker* than the board, because a bevel through
white paper shows its own shadow — and that cut is the whole of what distinguishes a mount from a
wide margin.

The framed piece is a **separate SVG document handed to an `<img>`**, which is the opening panel's
thumbnail trick and is here for the same reason twice over. A piece mints clip-path and filter ids
from its own seed, so two framings of it inlined together would collide; and the stage is left
alone, which matters because export serialises the live stage node, so a gallery that framed the
stage would quietly change what exporting means.

The artwork is clipped to its own rectangle inside a frame, which is not cosmetic: bloom,
aberration and glitch are given filter regions reaching well past the shapes they filter, and on
the stage the viewBox edge hides that. Measured in a browser, an unclipped mat had 11,523 pixels
contaminated by spill; clipped, none. Clipping stays off by default in the serialiser though, and
frames opt in — turning it on everywhere recropped sixteen of the twenty link previews, because
most pieces draw something outside their own bounds.

### Making it sit in the room

A correctly placed rectangle still reads as a sticker. A shadow puts it in front of the plaster;
what makes it an object is light falling *on* it, and the room coming back out of its glass.
Six layers, none of them large:

- **A shadow in two parts** — a wide soft one for the room's ambient light, and a tight dark one
  where the frame meets the plaster. That second is what the eye reads as contact rather than as a
  glow.
- **A lit edge.** An inset shadow offset toward the light leaves its band on the lit side, which is
  what a moulding catching the light looks like: a bright hairline on two sides and a dark one on
  the other two. Thin on purpose — past about a third of a percent it stops being an edge and
  becomes a border. This was the layer missing when the frames still looked printed on.
- **A sheen and an ambient falloff**, in one gradient layer. The sheen is narrow and sits on the lit
  corner rather than washing the face, because glass gives a defined reflection and not a haze. The
  falloff runs the way the room's light falls, so the far side of the piece sits in the same
  gradient the wall behind it is in. It is the quieter of the two and does the more work. Both run
  at the same angle, because CSS puts a gradient's 0% stop at the *start* of the line and not where
  the angle points — `linear-gradient(90deg, red, blue)` is red on the left. Opposing them, which
  looks right, puts the highlight on the dark corner.
- **A breath of the wall's own colour** over the work, because a print in a room is lit by that
  room, and a perfectly neutral rectangle sits on top of the photograph rather than in it.
- **The room reflected in the glazing** — two soft upright bands on the window side, a wide one and
  a narrow one, which is what a window with a mullion leaves on a framed print. This is the layer
  that lands *on* the artwork rather than around it, and the one that stops a piece reading as
  pasted on. Glass reflects things, so it needs an edge: the earlier wash over the whole face was
  haze, not reflection.
- **The mat's shadow on the print**, because a mounted print sits a few millimetres behind the
  opening. The shadowed strip is on the *lit* side, not the dark one — what blocks the light is the
  near wall of a recess — which is the kind of detail that reads as wrong without being
  identifiable if you get it backwards.

All of it is measured from the photograph rather than guessed, and lives on the room as `light` and
`wall`, so every photograph brings its own. The measuring is done by script, not by eye: the clean
wall is found by scanning each row for the longest unbroken run of wall colour, and the light by
comparing the brightness of the wall's left quarter against its right, then checking that against
the fall either side of something already standing in the room.

The linen wall is the case for doing it that way. Its one obvious feature is a bright window on the
right, which says the light is there — and the wall says otherwise at every height: 205.8 beside the
chair against 194.3 clear of it, 171.6 against 153.9 either side of the plant. The curtain is a
window plane, not what lights that wall.

The plank wall is the case for not stopping at one measurement. It is the first room lit from the
right, and three surfaces agree on that — the wall runs 63.7 to 76.4 across the far quarters, the
floor 161.3 to 172.2, the matte vessel 55.8 against 64.3 — while the chair reads the other way,
20.2 on its left against 11.0 on its right. The chair is a dark gloss shell, so that is a specular
highlight and not shading; diffuse surfaces are what the measurement is for. Its planks also defeat
the row scan, since the longest run of wall colour finds the stain rather than the furniture, so
the obstructions were found by colour family instead: the wall is red-dominant everywhere, the
chair and the tiles read blue, the plant reads green.

Sized in container-query units, because the piece is placed as a percentage of the photograph and
a shadow measured in pixels would be right at exactly one display size.

### Photographs

The room cannot join that SVG document. An SVG shown in an `<img>` may not load anything external,
so a `<image href="/rooms/...">` inside one renders as a hole, and the only way in would be to
carry the whole photograph as a data URI. So the room is a plain `<img>` and the framed piece is
laid over it in HTML, placed as fractions of the photograph so it holds at any displayed size.

That also decides what is worth photographing. A **flat-on** wall needs only a scale and a
translate, and is the cheap case: give it an `area` and it works. A wall shot **at an angle** needs
a true homography, which is the one thing CSS can do here that SVG cannot — SVG transforms are
affine, `matrix3d` is not. Either is supported; flat-on is simply less work to add. Leave generous
empty wall and keep the light even.

### An angled wall

An angled room carries a `plane` instead of an `area`: the homography from the wall's own
coordinates to fractions of the photograph. The wall's coordinates are isotropic, one unit across
being one unit down in real proportions, so a piece keeps its aspect just by being a rectangle in
them and the matrix does the foreshortening.

The slatted wall shows how to measure one, and the method generalises to anything with a repeating
feature. The slats are evenly spaced on the wall, so their image positions fit the projective map
`x(u) = (au + b)/(cu + 1)` exactly — 45 of them to a mean of 0.86px — and that map *is* the wall's
perspective. The panel's top edge gives the second row of the matrix. The ceiling's junction with
the perpendicular wall gives a second vanishing point, and two perpendicular vanishing points give
the focal length (2153px, 1.62× the frame), which gives the foreshortening: 40.3° off the image
plane, one unit of height to 55 slats of width.

Two things fell out of the derivation worth keeping. Verticals stay vertical on a wall shot with a
level camera, so the vertical scale at any point is simply its distance from the horizon — and the
first model written here was wrong, having verticals fall off as 1/Z² like the horizontals, when
only the receding direction is squared. And the whole thing is a true homography *only* when the
horizon equals y at the vanishing point, which the slat fit and the top edge agree on
independently. That agreement is the check that the measurement is sound, and it is worth
reproducing for any wall added this way.

One wrinkle in the compositing: an angled piece is drawn at its own size and then transformed down
onto the quad, so every length inside it shrinks by that factor — the shadow included. It is given
the inverse as a boost so it lands at the size the flat rooms use.

Attribution lives in the room definition rather than on the page, so a room cannot be added without
its credit.

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

## Dendrite

A branch splits, each piece splits again, the rule never changes and only the scale it applies at
does. Nerve cells, river deltas, frost and lightning all arrive at this shape from unrelated
physics, because it is what you get when something has to reach everywhere from one place. There
are no neighbours to search and no time to step, so it generates in about 6ms, and it can animate:
a preset sweep measures 2.51px of movement per frame at 30fps, squarely in the filmic band, with
the shape count constant across all 300 frames checked.

Two things make it behave under animation. Per-node randomness is drawn once up front for the whole
segment budget rather than as the recursion descends, so the number of rng draws never depends on
the dials — the figure never reshuffles mid-sweep — and a node's wobble is tied to its position in
the tree, so raising Depth grows new twigs onto the existing figure instead of drawing a different
one. And the silhouette is measured and fitted after growing rather than predicted before: a limb's
reach is a geometric series, but branches also spread sideways, wobble stretches segments and bow
bends the whole thing, so no closed form exists and every guess either clipped the canopy or left
the piece small. Fitting the real bounding box is exact for every form, and it keeps the
composition still while Shortening and Depth sweep.

## Palettes

Fifty sets, picked as swatches rather than named in a dropdown — the choice is the look, so it
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

Most pieces were designed for showcase rather than adapted to it — **moiré**, **harmonograph**,
**attractor**, **strata**, **halftone**, **contour**, **chladni**, **lens**, **blocks**, **packing**,
**rosette**, **glyphs**, **cells** and **phyllotaxis**. The trick is to spend
the rng entirely up front, on a noise field or a set of pendulum ratios, and have every param after
that transform fixed geometry. They end up with most of their range params animatable, the
strongest motion here, and 2-5ms generation.

**The Penrose tiling is the piece that can't be animated, and is anyway.** Deflation has no
continuous knob — the golden ratio is not a slider — so there is exactly one tiling and no way to
deform it; panning a camera over a fixed pattern is a slideshow. So the motion is the surface
instead: a travelling wave turns each rhomb about its own centre and opens the grout around it, by
an amount read off where the tile sits. The swell is cubed, which is the difference between a
ripple and confetti — a plain sine disturbs every tile all of the time and the pattern stops
reading as a tiling, while cubing holds most of them flush and concentrates the movement into a
narrow crest crossing an intact pattern. No tile is ever added or dropped, only turned, so the
element count is identical on every frame.

**Dendrite is the one with a budget.** A full tree is `branches^depth` wide, so its two structural
dials multiply catastrophically — 4 splits at depth 11 is four million segments. The total is
capped at 14,000 and depth gives way, the same bargain truchet makes with its cell count. Fourteen
thousand segments drawn as individual elements is more than the DOM wants, so they are batched into
one path per depth-and-ink, which is a few dozen elements instead.

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
    cove.js
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
    Toolbar.vue    generator picker, seed field, re-gen, reset
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
