import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import { renderPreview, CARD } from './src/core/preview.js'

const require = createRequire(import.meta.url)
await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')).then(initWasm)

// The site's own front-door card under a few candidate seeds.
const seeds = ['quiet-heron-41', 'quiet-rothko-41', 'tidal-riley-41', 'drifting-molnar-7', 'pale-hokusai-33', 'glass-albers-20']
const cells = seeds.map((s, i) => {
  const { svg } = renderPreview(`?g=flow-field&r=wide&s=${s}`, { frame: CARD })
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
  return `<g transform="translate(${(i % 2) * 600} ${Math.floor(i / 2) * 315}) scale(0.5)">${inner}</g>`
})
const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${315 * Math.ceil(seeds.length / 2)}" viewBox="0 0 1200 ${315 * Math.ceil(seeds.length / 2)}">${cells.join('')}</svg>`
await writeFile(process.argv[2], new Resvg(doc, { font: { loadSystemFonts: false }, fitTo: { mode: 'width', value: 1200 } }).render().asPng())
console.log(seeds.join('  |  '))
