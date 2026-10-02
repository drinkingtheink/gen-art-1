/**
 * The README's piece images.
 *
 * Every tile is a real piece at its authored defaults, on the same seed the
 * opening panel derives for that generator — so a shot in the README is the
 * card the picker shows and the piece clicking it opens, not a hand-tuned
 * render that flatters the project.
 *
 * Deterministic on purpose: the seed comes from the generator's id and the
 * palette is the authored default rather than the per-visit roll the panel
 * does, so re-running this reproduces the same images and a diff under
 * docs/pieces means a generator or a palette actually changed.
 *
 * Sheets are composed as one SVG of nested <g transform> and rasterised once,
 * rather than as twenty PNGs stitched together: it keeps the whole thing on
 * the DOM-free path the link previews already use, and one file beats twenty
 * in a repo. Safe here only because each generator appears at most once per
 * sheet — subdivision and penrose both emit clip-path ids, and two tiles of
 * the same piece would put two of the same id in one document.
 *
 *   node scripts/readmeShots.mjs
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import { defaultsFor } from '../src/core/params.js'
import { getPalette } from '../src/core/palettes.js'
import { createRng, randomSeed } from '../src/core/rng.js'
import { getRatio } from '../src/core/ratios.js'
import { renderSvg } from '../src/core/svg.js'
import { generators, getGenerator } from '../src/generators/index.js'

const require = createRequire(import.meta.url)
await initWasm(await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')))

const OUT = new URL('../docs/pieces/', import.meta.url).pathname
await mkdir(OUT, { recursive: true })

/** One piece as the panel would hand it over: derived seed, authored defaults. */
function piece(id, ratioId = 'square', overrides = {}) {
  const generator = getGenerator(id)
  const ratio = getRatio(ratioId)
  const seed = randomSeed(createRng(`launch:${generator.id}`))
  const params = { ...defaultsFor(generator), ...overrides }

  const scene = generator.generate({
    params,
    rng: createRng(seed),
    width: ratio.width,
    height: ratio.height,
    palette: getPalette(params.palette),
  })

  return { generator, seed, params, ratio, scene }
}

/** The inner markup of a scene — the document wrapper stripped back off. */
function inner(scene) {
  const doc = renderSvg(scene)
  return doc.slice(doc.indexOf('>') + 1, -'</svg>'.length)
}

/**
 * Tiles are clipped to their own rectangle, and that is not optional.
 *
 * Ten of the twenty pieces draw past their own bounds — moire worst, whole
 * ring systems of it — which the stage hides behind a viewBox edge and a
 * sheet does not: the first run had cove's stripes running the full height of
 * the contact sheet and subdivision wearing them. Same reason `renderSvg`
 * clips for a mount and not for a card.
 *
 * The gutters are left transparent rather than filled white, because GitHub
 * serves this README on a dark background as readily as a light one and every
 * tile already carries its own ground.
 */
function sheet(name, { width, height, tiles }, outWidth) {
  const body = tiles
    .map(({ scene, x, y, w }, i) => {
      const s = w / scene.width
      const id = `tile-${i}`
      return (
        `<g transform="translate(${x} ${y}) scale(${s.toFixed(6)})">` +
        `<clipPath id="${id}">` +
        `<rect x="0" y="0" width="${scene.width}" height="${scene.height}"/>` +
        `</clipPath>` +
        `<g clip-path="url(#${id})">` +
        `<rect x="0" y="0" width="${scene.width}" height="${scene.height}" fill="${scene.background}"/>` +
        inner(scene) +
        `</g></g>`
      )
    })
    .join('')

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}">` +
    body +
    `</svg>`

  const t0 = performance.now()
  const png = new Resvg(svg, {
    font: { loadSystemFonts: false },
    fitTo: { mode: 'width', value: outWidth },
  })
    .render()
    .asPng()

  return writeFile(`${OUT}/${name}.png`, png).then(() =>
    console.log(
      `${name.padEnd(10)} ${String(Math.round(png.length / 1024)).padStart(5)}KB  ` +
        `${outWidth}px  ${(performance.now() - t0).toFixed(0)}ms`,
    ),
  )
}

// Three pieces that between them say what the range is: hard geometry, an
// organic figure, and line work on a dark ground.
{
  const picks = ['subdivision', 'dendrite', 'flow-field'].map((id) => piece(id))
  const T = 640
  const GAP = 16
  await sheet(
    'hero',
    {
      width: T * 3 + GAP * 2,
      height: T,
      tiles: picks.map((p, i) => ({ scene: p.scene, x: i * (T + GAP), y: 0, w: T })),
    },
    1280,
  )
}

// All twenty, which is the screen the site actually opens on.
{
  const COLS = 5
  const T = 400
  const GAP = 14
  const rows = Math.ceil(generators.length / COLS)
  await sheet(
    'panel',
    {
      width: COLS * T + (COLS - 1) * GAP,
      height: rows * T + (rows - 1) * GAP,
      tiles: generators.map((g, i) => ({
        scene: piece(g.id).scene,
        x: (i % COLS) * (T + GAP),
        y: Math.floor(i / COLS) * (T + GAP),
        w: T,
      })),
    },
    1280,
  )
}

// Ratios hold area constant, so the three are drawn at one scale and the
// equal-area claim is something you can see rather than take on trust.
{
  const shapes = ['wide', 'square', 'a-portrait'].map((r) => piece('truchet', r))
  const SCALE = 0.42
  const GAP = 20
  const boxes = shapes.map((p) => ({ w: p.ratio.width * SCALE, h: p.ratio.height * SCALE }))
  const height = Math.max(...boxes.map((b) => b.h))
  let x = 0
  const tiles = shapes.map((p, i) => {
    const tile = { scene: p.scene, x, y: (height - boxes[i].h) / 2, w: boxes[i].w }
    x += boxes[i].w + GAP
    return tile
  })
  await sheet(
    'shapes',
    { width: x - GAP, height, tiles },
    1400,
  )
}
