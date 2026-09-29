import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import { launchPieces, renderThumbnail } from './src/core/launch.js'

const require = createRequire(import.meta.url)
await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')).then(initWasm)

const CELL = 240, COLS = 6
const cells = launchPieces.map((piece, i) => {
  const inner = renderThumbnail(piece).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
  return `<g transform="translate(${(i % COLS) * CELL} ${Math.floor(i / COLS) * CELL}) scale(${CELL / 1000})">${inner}</g>`
})
const rows = Math.ceil(launchPieces.length / COLS)
const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${COLS * CELL}" height="${rows * CELL}" viewBox="0 0 ${COLS * CELL} ${rows * CELL}"><rect width="100%" height="100%" fill="#16161a"/>${cells.join('')}</svg>`
await writeFile(process.argv[2], new Resvg(doc, { font: { loadSystemFonts: false }, fitTo: { mode: 'width', value: COLS * CELL } }).render().asPng())
console.log(launchPieces.map((p) => `${p.generator.id}:${p.state.seed}`).join('  '))
