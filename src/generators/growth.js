import { getPalette, paletteOptions } from '@/core/palettes.js'
import { simplifyPath } from '@/core/simplify.js'

/**
 * Differential growth.
 *
 * A closed loop of nodes under two opposing rules: each node pulls toward its
 * two neighbours along the ring, and pushes away from every node near it in
 * space — including nodes far away around the ring that happen to have drifted
 * close. Meanwhile the loop keeps inserting new nodes wherever it stretches.
 *
 * More perimeter forced into the same area has nowhere to go but sideways, so
 * the loop buckles into itself. How large the finished form gets is roughly
 * `maxNodes * restLength * repulsionRadius` in area — worth knowing, because
 * a low node budget makes a small dense knot rather than a large loose one. It's the mechanism behind brain coral, lettuce
 * edges and intestinal villi, and it's the only piece here that's a simulation
 * over time rather than a one-shot placement — the form isn't chosen, it's
 * arrived at.
 */

const params = [
  { key: 'startNodes', type: 'range', label: 'Seed nodes', min: 3, max: 40, step: 1, default: 12 },
  { key: 'iterations', type: 'range', label: 'Generations', min: 10, max: 400, step: 10, default: 200 },
  { key: 'restLength', type: 'range', label: 'Node spacing', min: 2, max: 24, step: 0.5, default: 9 },
  { key: 'repulsionRadius', type: 'range', label: 'Personal space', min: 4, max: 60, step: 1, default: 40 },
  { key: 'repulsion', type: 'range', label: 'Push', min: 0.05, max: 1, step: 0.01, default: 0.32 },
  { key: 'attraction', type: 'range', label: 'Pull', min: 0.05, max: 1, step: 0.01, default: 0.36 },
  { key: 'maxNodes', type: 'range', label: 'Node budget', min: 200, max: 5000, step: 100, default: 3000 },
  { key: 'growthRate', type: 'range', label: 'Growth rate', min: 0.005, max: 0.12, step: 0.005, default: 0.04 },
  { key: 'jitter', type: 'range', label: 'Growth noise', min: 0, max: 1, step: 0.01, default: 0.35 },
  { key: 'showHistory', type: 'toggle', label: 'Growth rings', default: true },
  { key: 'historyEvery', type: 'range', label: 'Ring spacing', min: 4, max: 60, step: 2, default: 16 },
  { key: 'lineWidth', type: 'range', label: 'Line width', min: 0.3, max: 6, step: 0.1, default: 1.4 },
  { key: 'margin', type: 'range', label: 'Margin', min: 0, max: 140, step: 2, default: 50 },
  { key: 'palette', type: 'select', label: 'Palette', options: paletteOptions, default: 'moss' },
  { key: 'colorBias', type: 'range', label: 'Colour bias', min: 0, max: 3, step: 0.1, default: 1.4 },
]

/**
 * This is the only generator that simulates rather than places, so it's the
 * only one whose cost is iterations x nodes rather than just output size.
 * Generations and node budget are each reasonable alone and ruinous together —
 * 400 x 5000 measured at 2.9 seconds of blocked UI — so the product is capped
 * and generations give way. Same pattern as truchet's cell budget.
 */
const WORK_BUDGET = 700000

/**
 * A node with a large personal space and tight spacing can have hundreds of
 * neighbours in range, and the repulsion loop is quadratic in that ratio. Past
 * this many, the crowd is *sampled* rather than fully counted.
 *
 * Sampling has to stay uniform. Simply stopping the scan after N neighbours
 * biases it: buckets are visited in a fixed spatial order, so a node in a
 * crowd always sees the same upper-left subset and gets pushed consistently
 * down-right. That drives regions of the loop into each other and it collapses
 * into a scribble. Taking every k-th neighbour across the whole neighbourhood
 * keeps the directional balance, and scaling the force by k keeps the total
 * push about right.
 */
const MAX_NEIGHBOURS = 160

/**
 * Buckets nodes into cells the size of the repulsion radius, so each node only
 * tests the 9 cells around it instead of every other node. Without this the
 * step is O(n^2) and a 4000-node loop over 400 generations is hopeless.
 */
function buildGrid(xs, ys, cell) {
  const grid = new Map()
  for (let i = 0; i < xs.length; i += 1) {
    // Integer key rather than a string — this is the hot path.
    const key = (Math.floor(xs[i] / cell) << 16) ^ (Math.floor(ys[i] / cell) & 0xffff)
    const bucket = grid.get(key)
    if (bucket) bucket.push(i)
    else grid.set(key, [i])
  }
  return grid
}

export default {
  id: 'growth',
  name: 'Differential Growth',
  blurb: 'A loop that pulls itself tight and pushes itself apart. It has to buckle.',
  params,

  generate({ params: p, rng, width, height }) {
    const palette = getPalette(p.palette)
    const inks = [...palette.colors].reverse()

    const left = p.margin
    const top = p.margin
    const right = width - p.margin
    const bottom = height - p.margin
    const cx = width / 2
    const cy = height / 2

    // Start as a small ring. Everything interesting comes from what happens
    // to it, so the starting shape is deliberately dull.
    const startRadius = Math.min(right - left, bottom - top) * 0.06
    const xs = []
    const ys = []
    for (let i = 0; i < p.startNodes; i += 1) {
      const a = (i / p.startNodes) * Math.PI * 2
      xs.push(cx + Math.cos(a) * startRadius)
      ys.push(cy + Math.sin(a) * startRadius)
    }

    const history = []
    const radius = p.repulsionRadius
    const radiusSq = radius * radius
    const iterations = Math.max(10, Math.min(p.iterations, Math.floor(WORK_BUDGET / p.maxNodes)))

    for (let step = 0; step < iterations; step += 1) {
      const n = xs.length
      const grid = buildGrid(xs, ys, radius)
      const dx = new Float64Array(n)
      const dy = new Float64Array(n)
      const nearby = []

      for (let i = 0; i < n; i += 1) {
        const x = xs[i]
        const y = ys[i]
        let fx = 0
        let fy = 0

        // Pull toward each ring neighbour, but only once the edge has
        // stretched past its rest length — otherwise the loop shrinks shut.
        for (const j of [(i - 1 + n) % n, (i + 1) % n]) {
          const ax = xs[j] - x
          const ay = ys[j] - y
          const d = Math.hypot(ax, ay)
          if (d > p.restLength) {
            const pull = ((d - p.restLength) / d) * p.attraction
            fx += ax * pull
            fy += ay * pull
          }
        }

        // Push away from anything close in space, whether or not it's close
        // along the ring. This is what stops the loop passing through itself.
        const gx = Math.floor(x / radius)
        const gy = Math.floor(y / radius)

        nearby.length = 0
        let crowd = 0
        for (let ox = -1; ox <= 1; ox += 1) {
          for (let oy = -1; oy <= 1; oy += 1) {
            const bucket = grid.get(((gx + ox) << 16) ^ ((gy + oy) & 0xffff))
            if (bucket) {
              nearby.push(bucket)
              crowd += bucket.length
            }
          }
        }

        const stride = crowd > MAX_NEIGHBOURS ? Math.ceil(crowd / MAX_NEIGHBOURS) : 1
        const weight = p.repulsion * stride

        for (const bucket of nearby) {
          for (let k = 0; k < bucket.length; k += stride) {
            const j = bucket[k]
            if (j === i) continue
            const rx = x - xs[j]
            const ry = y - ys[j]
            const dSq = rx * rx + ry * ry
            if (dSq === 0 || dSq > radiusSq) continue
            const d = Math.sqrt(dSq)
            const push = (1 - d / radius) * weight
            fx += (rx / d) * push
            fy += (ry / d) * push
          }
        }

        dx[i] = fx
        dy[i] = fy
      }

      // No node may move further in one generation than a fraction of the
      // spacing. Without this a node in a crowd can accumulate enough force to
      // jump clean through the strand next to it — the loop passes through
      // itself and the form degenerates into a scribble. Capping the step
      // makes tunnelling geometrically impossible rather than unlikely.
      const maxStep = p.restLength * 0.4
      for (let i = 0; i < n; i += 1) {
        let mx = dx[i]
        let my = dy[i]
        const mag = Math.hypot(mx, my)
        if (mag > maxStep) {
          mx = (mx / mag) * maxStep
          my = (my / mag) * maxStep
        }
        // Clamp rather than bounce: the loop presses against the frame and
        // grows along it, which is what gives the edges their flattened look.
        xs[i] = Math.min(right, Math.max(left, xs[i] + mx))
        ys[i] = Math.min(bottom, Math.max(top, ys[i] + my))
      }

      // Grow.
      //
      // Splitting only over-long edges isn't enough on its own: attraction
      // holds edges at rest length, so they never stretch far enough to
      // split, the loop reaches equilibrium and just sits there. Perimeter
      // has to be injected. So a proportion of nodes are added at *random*
      // edges every generation — the loop gains length it has no room for,
      // and buckling is the only way to absorb it.
      //
      // The jitter is what breaks the initial symmetry. Without it a perfect
      // ring grows into a slightly larger perfect ring.
      const wobble = p.jitter * p.restLength * 0.5
      const splitEdge = (i) => {
        const j = (i + 1) % xs.length
        const ex = xs[j] - xs[i]
        const ey = ys[j] - ys[i]
        xs.splice(i + 1, 0, xs[i] + ex / 2 + rng.gauss(0, wobble))
        ys.splice(i + 1, 0, ys[i] + ey / 2 + rng.gauss(0, wobble))
      }

      const additions = Math.ceil(xs.length * p.growthRate)
      for (let k = 0; k < additions && xs.length < p.maxNodes; k += 1) {
        splitEdge(rng.int(0, xs.length - 1))
      }

      // Keep resolution even where the loop has been stretched by repulsion.
      const splitAt = p.restLength * 2
      for (let i = xs.length - 1; i >= 0 && xs.length < p.maxNodes; i -= 1) {
        const j = (i + 1) % xs.length
        if (Math.hypot(xs[j] - xs[i], ys[j] - ys[i]) > splitAt) splitEdge(i)
      }

      if (p.showHistory && step % p.historyEvery === 0 && step > 0) {
        history.push({ xs: [...xs], ys: [...ys] })
      }
    }

    const shapes = []

    const ringToPath = (rx, ry) => {
      const flat = []
      for (let i = 0; i < rx.length; i += 1) flat.push(rx[i], ry[i])
      // Repeat the first point so the closing edge is simplified like any other.
      flat.push(rx[0], ry[0])
      return simplifyPath(flat, 0.6, true)
    }

    // Earlier generations sit underneath, fading back — the piece shows how it
    // got here, not just where it ended up.
    history.forEach((ring, index) => {
      const path = ringToPath(ring.xs, ring.ys)
      if (!path) return
      const depth = (index + 1) / (history.length + 1)
      shapes.push({
        tag: 'path',
        attrs: {
          d: path.d,
          fill: 'none',
          stroke: rng.weighted(inks, p.colorBias),
          'stroke-width': Math.max(0.3, p.lineWidth * 0.6),
          'stroke-opacity': (0.12 + depth * 0.4).toFixed(3),
          'stroke-linejoin': 'round',
        },
      })
    })

    const final = ringToPath(xs, ys)
    if (final) {
      shapes.push({
        tag: 'path',
        attrs: {
          d: final.d,
          fill: 'none',
          stroke: inks[0],
          'stroke-width': p.lineWidth,
          'stroke-linejoin': 'round',
        },
      })
    }

    return { width, height, background: palette.bg, shapes }
  },
}
