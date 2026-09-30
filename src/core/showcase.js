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
    // Only the radii move. The piece's own note says positions never do, and
    // it was the one preset that broke its own rule: `drift` displaced every
    // disc, measured at 11.4px a frame, which is what made it read as churn
    // rather than as breathing.
    //
    // Every centre here equals the param's default, which matters more than it
    // looks. Intensity scales a modulator's amplitude but not its centre, so a
    // centre set away from the default shifts the piece by a fixed amount no
    // matter how low intensity goes — this preset used to land 7.7px per disc
    // away from the still frame even at 0.15. Centred on the defaults, zero
    // intensity is the still frame exactly and low intensity is genuinely
    // slight.
    //
    // `phase` is left out for the same reason: it sweeps the noise field, and
    // since it bottoms out at its own minimum there is no way to centre it on
    // its default without half the cycle clamping flat.
    //
    // Three slow waves on long, mutually awkward periods, so the breathing
    // never lines up into an obvious loop.
    { key: 'bite', wave: 'sine', amplitude: 0.2, period: 11, phase: 0.35, centre: 0.55 },
    { key: 'maxRadius', wave: 'sine', amplitude: 0.04, period: 17, centre: 0.13 },
    { key: 'fieldScale', wave: 'drift', amplitude: 0.55, period: 23, centre: 1.2 },
  ],
  rosette: [
    // Each ring turns at its own rate, so it never repeats while staying
    // perfectly symmetric.
    { key: 'spin', wave: 'ramp', amplitude: 180, period: 23, centre: 180 },
    { key: 'petal', wave: 'sine', amplitude: 0.35, period: 13, centre: 0.66 },
    { key: 'bow', wave: 'sine', amplitude: 0.6, period: 19, phase: 0.3 },
    { key: 'twist', wave: 'drift', amplitude: 22, period: 29, centre: 12 },
  ],
  penrose: [
    // The tiling is fixed — deflation has no continuous knob — so the motion
    // is the surface rather than the pattern: a ripple crossing the mosaic,
    // turning each tile about its own centre and opening the grout at the
    // crest. The camera moves too, but slowly, underneath it.
    { key: 'wavePhase', wave: 'ramp', amplitude: 180, period: 11, centre: 180 },
    { key: 'wave', wave: 'sine', amplitude: 0.35, period: 29, centre: 0.6 },
    { key: 'waveScale', wave: 'drift', amplitude: 1.8, period: 37, centre: 3.6 },
    { key: 'spin', wave: 'ramp', amplitude: 180, period: 97, centre: 180 },
    { key: 'zoom', wave: 'sine', amplitude: 0.3, period: 43, centre: 1.35 },
  ],
  inversion: [
    // Kiss is the one to watch: it slides the generating circles through exact
    // tangency, and the whole orbit reorganises around that instant — open
    // dust on one side, overlapping spirals on the other.
    { key: 'kiss', wave: 'sine', amplitude: 0.11, period: 23, centre: 0.9 },
    { key: 'swell', wave: 'drift', amplitude: 0.1, period: 37, centre: 1.12 },
    { key: 'spin', wave: 'ramp', amplitude: 180, period: 79, centre: 180 },
    { key: 'fade', wave: 'sine', amplitude: 0.22, period: 17, phase: 0.4, centre: 0.4 },
  ],
  glyphs: [
    // The alphabet is fixed; the hand writing it changes.
    //
    // This is the calmest piece in the set and can't help being: a stroke is
    // about 47 units long, so even a large change to a letterform is a small
    // change in pixels. The periods are short to compensate — it still reads
    // as writing that breathes rather than writing that thrashes.
    { key: 'tracking', wave: 'sine', amplitude: 0.34, period: 7, centre: 0.7 },
    { key: 'slant', wave: 'sine', amplitude: 33, period: 9 },
    { key: 'bend', wave: 'drift', amplitude: 1, period: 6, centre: 0.15 },
    { key: 'ascender', wave: 'sine', amplitude: 0.5, period: 8, centre: 0.55 },
    { key: 'waver', wave: 'drift', amplitude: 1.1, period: 11, centre: 1.1 },
    { key: 'weight', wave: 'sine', amplitude: 0.07, period: 13, centre: 0.1 },
  ],
  cells: [
    // Sites wander, so every tile reshapes while the tile count holds.
    // Sites barely need to move: a site shifting a few units redraws the
    // whole tile around it, so these amplitudes are far smaller than they look
    // like they should be.
    { key: 'phase', wave: 'ramp', amplitude: 1.6, period: 71, centre: 1.6 },
    { key: 'drift', wave: 'sine', amplitude: 0.05, period: 37, centre: 0.4 },
    { key: 'relax', wave: 'sine', amplitude: 0.05, period: 43, centre: 0.5 },
    { key: 'inset', wave: 'drift', amplitude: 0.05, period: 17, centre: 0.09 },
  ],
  phyllotaxis: [
    // Divergence is the piece. A hundredth of a degree rebuilds every arm, so
    // the amplitude here is deliberately tiny.
    { key: 'divergence', wave: 'sine', amplitude: 0.22, period: 23, centre: 137.507 },
    { key: 'turn', wave: 'ramp', amplitude: 180, period: 41, centre: 180 },
    { key: 'grow', wave: 'sine', amplitude: 0.45, period: 17, centre: 0.35 },
    { key: 'packing', wave: 'drift', amplitude: 0.06, period: 31, centre: 0.52 },
  ],
  cove: [
    // A slow camera move, not a redraw. Every centre is the param's own
    // default, so intensity scales the whole move down to nothing rather than
    // leaving the piece parked somewhere else — the lesson packing taught.
    { key: 'angle', wave: 'sine', amplitude: 16, period: 29, centre: 0 },
    { key: 'tilt', wave: 'sine', amplitude: 7, period: 19, phase: 0.3, centre: 6 },
    { key: 'depth', wave: 'drift', amplitude: 0.5, period: 37, centre: 2.2 },
    { key: 'duty', wave: 'sine', amplitude: 0.1, period: 23, centre: 0.5 },
  ],
  dendrite: [
    // Spread is the one that matters: the angle between siblings compounds
    // down every level, so a few degrees at the trunk swings the whole
    // silhouette. Curl turns the figure against it, and shortening breathes
    // the density in and out.
    { key: 'spread', wave: 'sine', amplitude: 17, period: 13, centre: 36 },
    { key: 'curl', wave: 'sine', amplitude: 13, period: 19, phase: 0.3, centre: 0 },
    { key: 'lengthRatio', wave: 'sine', amplitude: 0.055, period: 23, centre: 0.76 },
    { key: 'bow', wave: 'drift', amplitude: 0.32, period: 17, centre: 0.15 },
    { key: 'lineWidth', wave: 'sine', amplitude: 0.7, period: 29, centre: 2.6 },
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
