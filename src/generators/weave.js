import { getPalette, paletteOptions } from '@/core/palettes.js'

/**
 * Weave.
 *
 * Strands crossing at right angles, alternating over and under. Nothing else
 * here has depth — every other piece is flat marks on paper, and this one
 * claims two surfaces that pass through each other.
 *
 * The interlacing is done by painting order rather than clipping: every strand
 * is drawn in full, then the segments that should sit on top are drawn again
 * over the crossing. Cheaper than masking, and it survives export as plain
 * paths.
 *
 * Built for showcase: the strand count is structural, but width, wave and
 * phase all move the ribbons continuously without changing how many there are.
 */

const params = [
  { key: 'strands', type: 'range', label: 'Strands', min: 3, max: 30, step: 1, default: 11, structural: true },
  { key: 'resolution', type: 'range', label: 'Smoothness', min: 4, max: 40, step: 1, default: 14, structural: true },
  { key: 'ribbon', type: 'range', label: 'Ribbon width', min: 0.1, max: 1.1, step: 0.005, default: 0.62 },
  { key: 'wave', type: 'range', label: 'Wave', min: 0, max: 1.2, step: 0.005, default: 0.22 },
  { key: 'waveRate', type: 'range', label: 'Wave rate', min: 0.2, max: 5, step: 0.02, default: 1.4 },
  { key: 'phase', type: 'range', label: 'Phase', min: 0, max: 6.3, step: 0.01, default: 0 },
  { key: 'skew', type: 'range', label: 'Skew', min: -30, max: 30, step: 0.2, default: 0 },
  { key: 'gap', type: 'range', label: 'Gap', min: 0, max: 0.5, step: 0.005, default: 0.08 },
  { key: 'edge', type: 'range', label: 'Edge', min: 0, max: 4, step: 0.05, default: 1 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 1, default: 40 },
  { key: 'palette', type: 'palette', label: 'Palette', options: paletteOptions, default: 'poppy' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.05, default: 0.5 },
]

const r1 = (n) => Math.round(n * 10) / 10

export default {
  id: 'weave',
  name: 'Weave',
  blurb: 'Strands over and under. The only piece here with two surfaces.',
  params,

  generate({ params: p, rng, width, height, palette: override }) {
    const palette = override ?? getPalette(p.palette)
    const inks = [...palette.colors].reverse()

    // Spent up front, for the largest strand count, so changing `strands`
    // doesn't recolour the ones that remain.
    const warpInks = Array.from({ length: 30 }, () => rng.weighted(inks, p.colorBias))
    const weftInks = Array.from({ length: 30 }, () => rng.weighted(inks, p.colorBias))
    const warpPhase = Array.from({ length: 30 }, () => rng.range(0, Math.PI * 2))
    const weftPhase = Array.from({ length: 30 }, () => rng.range(0, Math.PI * 2))

    const left = p.margin
    const top = p.margin
    const spanX = width - p.margin * 2
    const spanY = height - p.margin * 2
    const n = p.strands
    const pitchX = spanX / n
    const pitchY = spanY / n
    const halfX = (pitchX * p.ribbon) / 2
    const halfY = (pitchY * p.ribbon) / 2
    const skew = Math.tan((p.skew * Math.PI) / 180)

    /** Centre-line offset of a strand at position t along its length. */
    const offset = (phase, t) =>
      Math.sin(t * Math.PI * 2 * p.waveRate + phase + p.phase) * p.wave

    /**
     * A ribbon as a closed band: down one edge and back the other.
     * `from`/`to` are fractions of the strand's length, so a crossing can be
     * redrawn on its own without rebuilding the whole strand.
     */
    const ribbon = (vertical, index, phase, from, to) => {
      const steps = Math.max(2, Math.round(p.resolution * (to - from)) + 2)
      const along = []
      for (let s = 0; s <= steps; s += 1) {
        const t = from + ((to - from) * s) / steps
        along.push(t)
      }
      const edgeA = []
      const edgeB = []
      for (const t of along) {
        if (vertical) {
          const y = top + t * spanY
          const drift = offset(phase, t) * pitchX
          const x = left + (index + 0.5) * pitchX + drift + (t - 0.5) * spanY * skew
          edgeA.push([x - halfX, y])
          edgeB.push([x + halfX, y])
        } else {
          const x = left + t * spanX
          const drift = offset(phase, t) * pitchY
          const y = top + (index + 0.5) * pitchY + drift + (t - 0.5) * spanX * skew
          edgeA.push([x, y - halfY])
          edgeB.push([x, y + halfY])
        }
      }
      let d = `M${r1(edgeA[0][0])},${r1(edgeA[0][1])}`
      for (let i = 1; i < edgeA.length; i += 1) d += `L${r1(edgeA[i][0])},${r1(edgeA[i][1])}`
      for (let i = edgeB.length - 1; i >= 0; i -= 1) d += `L${r1(edgeB[i][0])},${r1(edgeB[i][1])}`
      return `${d}Z`
    }

    const paint = (fill) => {
      const attrs = { fill }
      if (p.edge > 0) {
        attrs.stroke = palette.bg
        attrs['stroke-width'] = p.edge
        attrs['stroke-linejoin'] = 'round'
      }
      return attrs
    }

    const shapes = []

    // Pass 1: every vertical strand, full length.
    for (let i = 0; i < n; i += 1) {
      shapes.push({ tag: 'path', attrs: { ...paint(warpInks[i]), d: ribbon(true, i, warpPhase[i], 0, 1) } })
    }

    // Pass 2: every horizontal strand, full length — so far all horizontals
    // sit over all verticals.
    for (let j = 0; j < n; j += 1) {
      shapes.push({ tag: 'path', attrs: { ...paint(weftInks[j]), d: ribbon(false, j, weftPhase[j], 0, 1) } })
    }

    // Pass 3: put the verticals back on top at every other crossing. That
    // alternation is the whole illusion.
    // How much of the vertical strand to redraw over a crossing: just enough
    // to cover the horizontal ribbon passing under it, plus a hair. Any more
    // and the over-segments read as long bars rather than a crossing — at the
    // first attempt they spanned 140 units across an 84-unit cell.
    const bite = Math.min(0.5, (p.ribbon * 0.5 + 0.06 + p.gap * 0.2) / n)
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        if ((i + j) % 2 === 0) continue
        const centre = (j + 0.5) / n
        shapes.push({
          tag: 'path',
          attrs: {
            ...paint(warpInks[i]),
            d: ribbon(true, i, warpPhase[i], Math.max(0, centre - bite), Math.min(1, centre + bite)),
          },
        })
      }
    }

    return { width, height, background: palette.bg, shapes }
  },
}
