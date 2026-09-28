/**
 * Showcase mode — modulating a piece's params over time so it animates.
 *
 * The hard constraint is that generators consume the rng in sequence, so any
 * param that changes *how much* randomness is drawn reshuffles the whole piece
 * instead of moving it. Modulating one of those flickers rather than animates.
 * Which params are safe was measured per generator (shape-count stability
 * across frames) and is declared in each schema as `structural: true`.
 *
 * `paramsAt` is pure: the same time always gives the same params, so playback
 * is repeatable and a given moment can be returned to exactly.
 */

const TAU = Math.PI * 2

export const WAVES = {
  /** Smooth and endless — the default for anything that should breathe. */
  sine: (phase) => Math.sin(phase * TAU),
  /** Linear in and out; reads as more mechanical than sine. */
  triangle: (phase) => 4 * Math.abs(phase - Math.floor(phase + 0.5)) - 1,
  /** One-way sweep that snaps back. Good for slow builds. */
  ramp: (phase) => 2 * (phase - Math.floor(phase)) - 1,
  /** Sine with the ends flattened — lingers at the extremes. */
  hold: (phase) => Math.tanh(Math.sin(phase * TAU) * 2),
  /**
   * Wandering rather than cyclic, from summed primes-ish sines. Never repeats
   * on any period you'd notice, which stops a long shot looking looped.
   */
  drift: (phase) =>
    (Math.sin(phase * TAU) + Math.sin(phase * TAU * 0.37 + 1.7) + Math.sin(phase * TAU * 0.173 + 4.1)) / 2.4,
}

export const WAVE_OPTIONS = [
  { value: 'sine', label: 'Sine · breathe' },
  { value: 'drift', label: 'Drift · wander' },
  { value: 'triangle', label: 'Triangle · mechanical' },
  { value: 'hold', label: 'Hold · linger' },
  { value: 'ramp', label: 'Ramp · sweep' },
]

/**
 * Params at a moment in time.
 *
 * `intensity` scales every amplitude at once, so the whole piece can be calmed
 * or pushed without editing each modulator. Values are clamped to each spec's
 * own range, so modulation can never drive a param somewhere the generator
 * isn't expecting.
 */
export function paramsAt(time, base, modulators, specs, intensity = 1) {
  if (!modulators.length || intensity === 0) return base

  const byKey = Object.fromEntries(specs.map((s) => [s.key, s]))
  const out = { ...base }

  for (const mod of modulators) {
    const spec = byKey[mod.key]
    if (!spec || spec.type !== 'range') continue

    const wave = WAVES[mod.wave] ?? WAVES.sine
    const phase = mod.period > 0 ? time / mod.period + (mod.phase ?? 0) : 0
    const centre = mod.centre ?? base[mod.key]
    const value = centre + wave(phase) * mod.amplitude * intensity

    // Deliberately NOT snapped to spec.step. The step exists so sliders feel
    // right; generators take continuous values happily. Snapping here holds a
    // param still for several frames and then jumps it, which reads as judder
    // rather than motion — measured as a median per-frame change of exactly
    // zero with the movement arriving in spikes.
    out[mod.key] = Math.min(spec.max, Math.max(spec.min, value))
  }

  return out
}

/**
 * Starting motion per piece.
 *
 * Amplitudes are deliberately small. Measured against a calibration where
 * re-seeding every frame scores 0.575 and a still frame scores 0, these land
 * around 0.01-0.05 per frame — motion that reads as movement rather than
 * churn. noiseScale in particular is far more sensitive than its slider
 * suggests: +0.002 per frame is already visible.
 *
 * Periods avoid common factors so the combined motion doesn't visibly loop.
 */
export const PRESETS = {
  'flow-field': [
    { key: 'noiseScale', wave: 'drift', amplitude: 0.09, period: 13 },
    { key: 'angleTurns', wave: 'sine', amplitude: 0.18, period: 19, phase: 0.25 },
    { key: 'steps', wave: 'sine', amplitude: 22, period: 7.5 },
    { key: 'lineWidth', wave: 'sine', amplitude: 0.35, period: 23, phase: 0.5 },
  ],
  truchet: [
    { key: 'inset', wave: 'sine', amplitude: 0.13, period: 9, centre: 0.14 },
    { key: 'lineWeight', wave: 'drift', amplitude: 0.16, period: 14, centre: 0.3 },
    { key: 'margin', wave: 'sine', amplitude: 42, period: 17, phase: 0.3, centre: 60 },
    { key: 'colorBias', wave: 'sine', amplitude: 0.7, period: 11 },
  ],
  subdivision: [
    { key: 'gutter', wave: 'sine', amplitude: 2, period: 11, centre: 6 },
    { key: 'cornerRadius', wave: 'drift', amplitude: 9, period: 17, centre: 13 },
    { key: 'colorBias', wave: 'sine', amplitude: 0.8, period: 13, phase: 0.4 },
    { key: 'strokeWidth', wave: 'sine', amplitude: 1.2, period: 19 },
  ],
  moire: [
    // Rotation is the star: a fraction of a degree redraws the whole
    // interference pattern, so it sweeps without ever looking like it's
    // merely spinning.
    { key: 'rotation', wave: 'ramp', amplitude: 90, period: 47, centre: 90 },
    { key: 'spread', wave: 'sine', amplitude: 2.4, period: 13, centre: 3.6 },
    { key: 'phase', wave: 'ramp', amplitude: 0.5, period: 6.5, centre: 0.5 },
    { key: 'warp', wave: 'drift', amplitude: 22, period: 17, centre: 30 },
    { key: 'squeeze', wave: 'sine', amplitude: 0.22, period: 23, centre: 1.05 },
  ],
  harmonograph: [
    // Phase drift precesses the figure; detune decides whether it closes at
    // all. Together they read as a slowly tumbling object.
    { key: 'drift', wave: 'ramp', amplitude: 3.15, period: 29, centre: 3.15 },
    { key: 'detune', wave: 'sine', amplitude: 0.011, period: 19, centre: 0.015 },
    { key: 'damping', wave: 'sine', amplitude: 0.16, period: 11, centre: 0.26 },
    { key: 'spanTurns', wave: 'drift', amplitude: 4, period: 37, centre: 15 },
    { key: 'separation', wave: 'sine', amplitude: 26, period: 23, centre: 28 },
  ],
  attractor: [
    // The four constants are the instrument. Tiny, slow, out-of-phase moves
    // keep the figure reorganising without ever settling into a loop.
    { key: 'a', wave: 'drift', amplitude: 0.1, period: 23, centre: 1.4 },
    { key: 'b', wave: 'sine', amplitude: 0.09, period: 31, centre: -2.3, phase: 0.2 },
    { key: 'c', wave: 'drift', amplitude: 0.12, period: 19, centre: 2.4, phase: 0.55 },
    { key: 'd', wave: 'sine', amplitude: 0.09, period: 37, centre: -2.1, phase: 0.8 },
    { key: 'spin', wave: 'ramp', amplitude: 180, period: 71, centre: 180 },
  ],
  strata: [
    // Phase slides the field through the boundaries, so the stack undulates.
    { key: 'phase', wave: 'ramp', amplitude: 10, period: 41, centre: 10 },
    { key: 'warp', wave: 'sine', amplitude: 46, period: 17, centre: 86 },
    { key: 'squash', wave: 'sine', amplitude: 0.14, period: 29, centre: 0.86 },
    { key: 'tilt', wave: 'drift', amplitude: 13, period: 23 },
  ],
  halftone: [
    // The grid never moves; only the dots resize as the field slides under it.
    { key: 'phase', wave: 'ramp', amplitude: 8, period: 37, centre: 8 },
    { key: 'fieldScale', wave: 'sine', amplitude: 0.5, period: 23, centre: 1.7 },
    { key: 'contrast', wave: 'drift', amplitude: 1.1, period: 17, centre: 2.2 },
    { key: 'angle', wave: 'sine', amplitude: 22, period: 29, centre: 24 },
  ],
  contour: [
    // Phase flows the map; depth breathes the levels through the field.
    { key: 'phase', wave: 'ramp', amplitude: 3.5, period: 67, centre: 3.5 },
    { key: 'depth', wave: 'sine', amplitude: 0.5, period: 19, centre: 0.5 },
    { key: 'fieldScale', wave: 'drift', amplitude: 0.16, period: 41, centre: 1.2 },
    { key: 'range', wave: 'sine', amplitude: 0.1, period: 23, centre: 0.82 },
  ],
  chladni: [
    // Whole mode numbers are the figures a real plate holds. Sliding between
    // them morphs one standing wave into the next, which is the motion.
    { key: 'modeA', wave: 'drift', amplitude: 2.4, period: 17, centre: 6.5 },
    { key: 'modeB', wave: 'sine', amplitude: 2.8, period: 23, centre: 9.5, phase: 0.3 },
    { key: 'mix', wave: 'sine', amplitude: 0.22, period: 19, centre: 0.62 },
    { key: 'detune', wave: 'drift', amplitude: 0.22, period: 23, centre: 0.24 },
    { key: 'spread', wave: 'sine', amplitude: 0.1, period: 13, centre: 0.26 },
  ],
  lens: [
    // Orbiting the lenses sweeps the bulge across a lattice that never moves.
    { key: 'spin', wave: 'ramp', amplitude: 180, period: 17, centre: 180 },
    { key: 'strength', wave: 'sine', amplitude: 0.55, period: 11, centre: 0.45 },
    { key: 'reach', wave: 'drift', amplitude: 0.22, period: 23, centre: 0.66 },
    { key: 'twist', wave: 'sine', amplitude: 0.5, period: 41 },
  ],
  blocks: [
    // The lattice holds still while every block rises and falls through it.
    { key: 'phase', wave: 'ramp', amplitude: 6, period: 29, centre: 6 },
    { key: 'rise', wave: 'sine', amplitude: 70, period: 17, centre: 130 },
    { key: 'fieldScale', wave: 'drift', amplitude: 0.4, period: 23, centre: 1.2 },
    { key: 'pitch', wave: 'sine', amplitude: 0.13, period: 37, centre: 0.5 },
  ],
  packing: [
    // Positions never move; the field decides how much room each disc claims.
    { key: 'phase', wave: 'ramp', amplitude: 7, period: 31, centre: 7 },
    { key: 'maxRadius', wave: 'sine', amplitude: 0.05, period: 19, centre: 0.14 },
    { key: 'bite', wave: 'sine', amplitude: 0.3, period: 13, centre: 0.55 },
    { key: 'drift', wave: 'sine', amplitude: 0.9, period: 11, centre: 1.1 },
    { key: 'fieldScale', wave: 'drift', amplitude: 0.5, period: 23, centre: 1.3 },
  ],
  rosette: [
    // Each ring turns at its own rate, so it never repeats while staying
    // perfectly symmetric.
    { key: 'spin', wave: 'ramp', amplitude: 180, period: 23, centre: 180 },
    { key: 'petal', wave: 'sine', amplitude: 0.35, period: 13, centre: 0.66 },
    { key: 'bow', wave: 'sine', amplitude: 0.6, period: 19, phase: 0.3 },
    { key: 'twist', wave: 'drift', amplitude: 22, period: 29, centre: 12 },
  ],
  growth: [
    { key: 'attraction', wave: 'sine', amplitude: 0.12, period: 15 },
    { key: 'jitter', wave: 'drift', amplitude: 0.22, period: 9 },
    { key: 'margin', wave: 'sine', amplitude: 22, period: 21, phase: 0.6 },
    { key: 'lineWidth', wave: 'sine', amplitude: 0.5, period: 17 },
  ],
}

/** Only params that were measured safe to modulate, for building the UI. */
export function animatableParams(generator) {
  return generator.params.filter((s) => s.type === 'range' && !s.structural)
}

export function presetFor(generator) {
  const preset = PRESETS[generator.id] ?? []
  const safe = new Set(animatableParams(generator).map((s) => s.key))
  return preset.filter((m) => safe.has(m.key)).map((m) => ({ phase: 0, ...m }))
}
