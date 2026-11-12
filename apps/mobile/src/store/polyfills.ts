// Hermes has no DOMException and no structuredClone. fake-indexeddb needs both
// when it loads. The rows of the learner's data hold only plain values, arrays,
// objects and dates.

const g = globalThis as Record<string, unknown>

if (typeof g.DOMException === 'undefined') {
  g.DOMException = class DOMException extends Error {
    constructor(message = '', name = 'Error') {
      super(message)
      this.name = name
    }
  }
}

function clone(value: unknown, seen: Map<object, unknown>): unknown {
  if (typeof value === 'function' || typeof value === 'symbol') {
    const E = g.DOMException as new (message: string, name: string) => Error
    throw new E('The value cannot be cloned.', 'DataCloneError')
  }
  if (typeof value !== 'object' || value === null) return value
  if (seen.has(value)) return seen.get(value)
  if (value instanceof Date) return new Date(value.getTime())
  if (value instanceof RegExp) return new RegExp(value.source, value.flags)
  if (value instanceof ArrayBuffer) return value.slice(0)
  if (ArrayBuffer.isView(value)) {
    const View = value.constructor as new (buffer: ArrayBuffer) => ArrayBufferView
    return new View((value.buffer as ArrayBuffer).slice(value.byteOffset, value.byteOffset + value.byteLength))
  }
  if (value instanceof Map) {
    const out = new Map()
    seen.set(value, out)
    value.forEach((v, k) => out.set(clone(k, seen), clone(v, seen)))
    return out
  }
  if (value instanceof Set) {
    const out = new Set()
    seen.set(value, out)
    value.forEach((v) => out.add(clone(v, seen)))
    return out
  }
  if (Array.isArray(value)) {
    const out: unknown[] = []
    seen.set(value, out)
    value.forEach((v, i) => (out[i] = clone(v, seen)))
    return out
  }
  const out: Record<string, unknown> = {}
  seen.set(value, out)
  for (const key of Object.keys(value)) out[key] = clone((value as Record<string, unknown>)[key], seen)
  return out
}

if (typeof g.structuredClone !== 'function') g.structuredClone = (value: unknown) => clone(value, new Map())
