/**
 * Param schema utilities.
 *
 * Every param value that reaches a generator passes through coerce(), whether
 * it came from a slider, a URL someone hand-edited, or a link saved before the
 * schema changed. A bad value degrades to the default rather than rendering
 * nothing.
 */

/** Decimal places implied by a step, so 0.1 + 0.2 style noise never reaches a param. */
function decimalsOf(step) {
  const text = String(step)
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : text.length - dot - 1
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/**
 * Clamp, snap and type-check one value against its spec.
 *
 * `snap` exists for the one case that must not snap: freezing a showcase
 * frame. Modulation runs continuous on purpose, so rounding the frozen values
 * to slider steps would shift the piece off the frame you paused on.
 */
export function coerce(spec, raw, { snap = true } = {}) {
  switch (spec.type) {
    case 'range': {
      const n = Number(raw)
      if (!Number.isFinite(n)) return spec.default
      const clamped = Math.min(spec.max, Math.max(spec.min, n))
      if (!snap) return clamped
      const step = spec.step ?? 1
      const snapped = spec.min + Math.round((clamped - spec.min) / step) * step
      return Number(Math.min(spec.max, snapped).toFixed(decimalsOf(step)))
    }
    // 'palette' is a select that renders as swatches; validation is identical.
    case 'select':
    case 'palette':
      return spec.options.some((o) => o.value === raw) ? raw : spec.default
    case 'color':
      return typeof raw === 'string' && HEX.test(raw.trim()) ? raw.trim().toLowerCase() : spec.default
    case 'toggle':
      if (typeof raw === 'boolean') return raw
      if (raw === 'true' || raw === '1') return true
      if (raw === 'false' || raw === '0') return false
      return spec.default
    default:
      return raw ?? spec.default
  }
}

/** The generator's params at their declared defaults. */
export function defaultsFor(generator) {
  return Object.fromEntries(generator.params.map((spec) => [spec.key, spec.default]))
}

/**
 * A complete, valid param set built from whatever partial object is supplied.
 * Unknown keys are dropped; missing keys take their default.
 */
export function coerceAll(generator, raw = {}, options) {
  return Object.fromEntries(
    generator.params.map((spec) => [
      spec.key,
      spec.key in raw ? coerce(spec, raw[spec.key], options) : spec.default,
    ]),
  )
}
