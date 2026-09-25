/**
 * lite.js — a small, dependency-free Mongoose-compatible ODM backed by SQLite.
 *
 * WHY THIS EXISTS
 * ---------------
 * The server is written against the Mongoose API (models, schemas, queries,
 * aggregates, populate…). Mongoose needs a real MongoDB process, which is not
 * always available (CI sandboxes, offline laptops, quick demos). This module
 * implements the *subset* of the Mongoose surface this project uses on top of
 * the built-in `node:sqlite` driver, so the exact same model/route code runs
 * with zero external services.
 *
 * Set `MONGODB_URI` in the environment and `server/src/db/orm.js` will load the
 * real Mongoose instead — no application code changes required.
 *
 * Supported surface (everything the app relies on):
 *   new Schema(definition, { timestamps, collection })
 *   model(name, schema)                      -> Model
 *   Model.create / insertMany / find / findOne / findById
 *   Model.findByIdAndUpdate / findOneAndUpdate / updateOne / updateMany
 *   Model.deleteOne / deleteMany / countDocuments / exists / distinct
 *   Model.aggregate([$match, $group, $sort, $limit, $skip, $project, $unwind, $lookup])
 *   query.sort() / .limit() / .skip() / .select() / .populate() / .lean()
 *   document.save() / toObject() / toJSON() / populated refs / timestamps
 *   Query operators: $or $and $nor $in $nin $ne $gt $gte $lt $lte $regex
 *                    $options $exists $all $size $not
 *   Update operators: $set $unset $inc $mul $min $max $push $pull $addToSet
 *   Types.ObjectId (incl. .isValid)
 *
 * Storage: one SQLite table per collection — `id TEXT PRIMARY KEY, doc TEXT`.
 * Reads hydrate the whole (small) collection into memory; every write is
 * committed synchronously, so data survives restarts.
 */
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/

/* ══════════════════════════════ ObjectId ══════════════════════════════ */

function newObjectIdHex() {
  const seconds = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0')
  return seconds + randomBytes(8).toString('hex')
}

export class ObjectId {
  constructor(value) {
    if (value instanceof ObjectId) {
      this.hex = value.hex
      return
    }
    if (value == null || value === '') {
      this.hex = newObjectIdHex()
      return
    }
    if (typeof value === 'string' && OBJECT_ID_RE.test(value)) {
      this.hex = value.toLowerCase()
      return
    }
    if (typeof value === 'object' && OBJECT_ID_RE.test(value.hex || '')) {
      this.hex = String(value.hex).toLowerCase()
      return
    }
    const err = new Error(`Cast to ObjectId failed for value "${value}"`)
    err.name = 'CastError'
    throw err
  }

  toString() {
    return this.hex
  }

  toJSON() {
    return this.hex
  }

  toHexString() {
    return this.hex
  }

  equals(other) {
    if (other == null) return false
    return String(other) === this.hex
  }

  getTimestamp() {
    return new Date(parseInt(this.hex.slice(0, 8), 16) * 1000)
  }

  static isValid(value) {
    if (value instanceof ObjectId) return true
    if (typeof value === 'string') return OBJECT_ID_RE.test(value)
    if (value && typeof value === 'object') return OBJECT_ID_RE.test(String(value.hex || ''))
    return false
  }

  static createFromTime() {
    return new ObjectId()
  }
}

export const Types = { ObjectId, Document: ObjectId }

/* ══════════════════════════════ Helpers ══════════════════════════════ */

const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v) && v.constructor === Object
const isTypeCtor = (v) => v === String || v === Number || v === Boolean || v === Date || v === Object || v === Array || v === ObjectId
const isDescriptor = (v) => isPlainObject(v) && ('type' in v || 'ref' in v || 'default' in v || 'required' in v || 'enum' in v)

function clone(value) {
  if (value == null) return value
  if (value instanceof ObjectId) return new ObjectId(value.hex)
  if (value instanceof Date) return new Date(value.getTime())
  if (Array.isArray(value)) return value.map(clone)
  if (isPlainObject(value)) {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = clone(v)
    return out
  }
  return value
}

function getPath(source, dotted) {
  return String(dotted)
    .split('.')
    .reduce((acc, key) => (acc == null ? acc : acc[key]), source)
}

function setPath(target, dotted, value) {
  const keys = String(dotted).split('.')
  let node = target
  for (let i = 0; i < keys.length - 1; i++) {
    if (node[keys[i]] == null || typeof node[keys[i]] !== 'object') node[keys[i]] = {}
    node = node[keys[i]]
  }
  node[keys[keys.length - 1]] = value
}

const pluralize = (name) => {
  const lower = String(name).toLowerCase()
  if (/(s|x|z|ch|sh)$/.test(lower)) return lower + 'es'
  if (/[^aeiou]y$/.test(lower)) return lower.slice(0, -1) + 'ies'
  return lower + 's'
}

class ValidationError extends Error {
  constructor(errors) {
    super(Object.values(errors).map((e) => e.message).join(', '))
    this.name = 'ValidationError'
    this.errors = errors
  }
}

/* ══════════════════════════════ Schema ══════════════════════════════ */

function parseDescriptor(def) {
  // Primitives written shorthand: `name: String`
  if (isTypeCtor(def)) return { kind: 'primitive', type: def }
  if (def === undefined || def === null) return { kind: 'any' }

  // `address: { line: String, city: String }` → nested object
  if (isPlainObject(def) && !isDescriptor(def)) {
    return { kind: 'object', fields: flattenDefinition(def) }
  }

  if (Array.isArray(def)) {
    if (def.length === 0) return { kind: 'array', of: { kind: 'any' } }
    const first = def[0]
    if (first instanceof Schema) return { kind: 'array', of: { kind: 'subdocument', schema: first } }
    if (isTypeCtor(first)) return { kind: 'array', of: { kind: 'primitive', type: first } }
    return { kind: 'array', of: parseDescriptor(first) }
  }

  if (def instanceof Schema) return { kind: 'subdocument', schema: def }

  if (isPlainObject(def)) {
    // `{ type: { type: String } }` — the classic Mongoose double-`type` form
    const typeIsShape = isPlainObject(def.type) && !isTypeCtor(def.type)
    if (typeIsShape) {
      if (def.type.type) return { kind: 'primitive', type: def.type.type, ...restOf(def) }
      return { kind: 'object', fields: flattenDefinition(def.type), ...restOf(def) }
    }
    const descriptor = {
      kind: 'primitive',
      type: isTypeCtor(def.type) ? def.type : def.type === undefined ? String : def.type,
      ...restOf(def),
    }
    // Arrays declared as `{ type: [String] }` or `{ type: [someSchema] }`
    if (Array.isArray(def.type)) {
      descriptor.kind = 'array'
      descriptor.of = def.type.length ? parseDescriptor(def.type[0]) : { kind: 'any' }
      descriptor.type = Array
    }
    return descriptor
  }

  return { kind: 'any' }
}

function restOf(def) {
  const { type, ...rest } = def
  return rest
}

function flattenDefinition(definition) {
  const fields = {}
  for (const [key, value] of Object.entries(definition || {})) {
    fields[key] = parseDescriptor(value)
  }
  return fields
}

export class Schema {
  constructor(definition = {}, options = {}) {
    this.definition = definition
    this.options = options || {}
    this.paths = flattenDefinition(definition)
    if (this.options.timestamps) {
      this.paths.createdAt = { kind: 'primitive', type: Date }
      this.paths.updatedAt = { kind: 'primitive', type: Date }
    }
  }

  /** Minimal SchemaType stand-in — supports the `.cast()` helper used in queries. */
  path(name) {
    const descriptor = this.paths[name] || { kind: 'any' }
    return {
      instance: descriptor.type?.name,
      descriptor,
      cast: (value) => castValue(descriptor, value),
    }
  }

  add(definition) {
    Object.assign(this.paths, flattenDefinition(definition))
    return this
  }
}

Schema.Types = { ObjectId, String, Number, Boolean, Date, Array, Object }

/* ══════════════════════════════ Casting / defaults ══════════════════════════════ */

function castValue(descriptor, value) {
  if (value == null) return value
  const { kind, type } = descriptor

  if (kind === 'array') {
    const list = Array.isArray(value) ? value : [value]
    return list.map((v) => castValue(descriptor.of || { kind: 'any' }, v))
  }

  if (kind === 'object' || kind === 'subdocument') {
    if (!isPlainObject(value) && !(value instanceof Date)) return value
    return castDocument(descriptor.fields || descriptor.schema?.paths || {}, value)
  }

  if (kind === 'any' || !type) return value

  if (type === String) {
    let str = value instanceof ObjectId ? value.toString() : String(value)
    if (descriptor.trim) str = str.trim()
    if (descriptor.lowercase) str = str.toLowerCase()
    if (descriptor.uppercase) str = str.toUpperCase()
    return str
  }
  if (type === Number) {
    const num = Number(value)
    return Number.isNaN(num) ? value : num
  }
  if (type === Boolean) return Boolean(value) && value !== 'false'
  if (type === Date) {
    if (value instanceof Date) return value
    if (typeof value === 'number') return new Date(value)
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed
  }
  if (type === ObjectId) {
    if (value instanceof ObjectId) return value
    if (ObjectId.isValid(value)) return new ObjectId(value)
    return value
  }
  return value
}

function castDocument(paths, source) {
  const out = Array.isArray(source) ? [] : {}
  for (const [key, descriptor] of Object.entries(paths)) {
    if (!(key in source)) continue
    const value = source[key]
    if (value === undefined) continue
    if (Array.isArray(value) && descriptor.kind === 'array') {
      out[key] = value.map((v) => castValue(descriptor.of || { kind: 'any' }, v))
    } else if (isPlainObject(value) && (descriptor.kind === 'object' || descriptor.kind === 'subdocument')) {
      out[key] = castDocument(descriptor.fields || descriptor.schema?.paths || {}, value)
    } else {
      out[key] = castValue(descriptor, value)
    }
  }
  // keep unknown/extra keys (schemas here are permissive by design)
  for (const [key, value] of Object.entries(source)) {
    if (!(key in paths)) out[key] = value
  }
  // sub-documents that declare an `_id` get one automatically
  if (paths._id && source._id == null && paths._id.auto !== false && paths._id.type !== String) {
    out._id = new ObjectId()
  }
  // mutate in place so callers (documents) keep working on the same object
  for (const key of Object.keys(source)) if (!(key in out)) delete source[key]
  return Object.assign(source, out)
}

/** True when a nested descriptor tree declares at least one default value. */
function hasDefaults(descriptor) {
  const fields = descriptor.fields || descriptor.schema?.paths || {}
  return Object.values(fields).some((child) => child.default !== undefined || (child.fields || child.schema?.paths) && hasDefaults(child))
}

function applyDefaults(descriptor, raw, prefix = '') {
  for (const [key, child] of Object.entries(descriptor.fields || descriptor.schema?.paths || {})) {
    const path = prefix ? `${prefix}.${key}` : key
    const value = getPath(raw, path)

    if (child.kind === 'subdocument' || child.kind === 'object') {
      const fields = child.fields || child.schema?.paths || {}
      if (value === undefined) {
        if (child.default !== undefined) setPath(raw, path, resolveDefault(child))
        else if (hasDefaults(child) || child.kind === 'subdocument') {
          setPath(raw, path, applyDefaults({ fields }, {}))
        }
      } else if (isPlainObject(value)) {
        applyDefaults({ fields }, raw, path)
      }
      continue
    }

    if (child.kind === 'array') {
      if (value === undefined) setPath(raw, path, child.default !== undefined ? resolveDefault(child) : [])
      continue
    }

    if (value === undefined && child.default !== undefined) setPath(raw, path, resolveDefault(child))
  }
  return raw
}

function resolveDefault(descriptor) {
  const value = descriptor.default
  if (typeof value === 'function') {
    // `default: Date.now` should produce a timestamp, `default: () => 'x'` a value
    return value === Date.now ? new Date() : value()
  }
  if (value instanceof ObjectId) return new ObjectId(value.hex)
  if (value instanceof Date) return new Date(value.getTime())
  return clone(value)
}

function validateDocument(paths, raw, errors = {}, prefix = '') {
  for (const [key, descriptor] of Object.entries(paths)) {
    const path = prefix ? `${prefix}.${key}` : key
    const value = getPath(raw, path)

    if (descriptor.required && (value === undefined || value === null || value === '')) {
      errors[path] = { message: `Path \`${path}\` is required.` }
      continue
    }
    if (value === undefined || value === null) continue

    if (descriptor.enum && Array.isArray(descriptor.enum) && !descriptor.enum.includes(value)) {
      errors[path] = { message: `\`${value}\` is not a valid enum value for path \`${path}\`.` }
    }
    if (descriptor.type === Number && Number.isNaN(Number(value)) && typeof value !== 'number') {
      errors[path] = { message: `Cast to Number failed for value "${value}" at path "${path}"` }
    }
    if (descriptor.min != null && typeof value === 'number' && value < descriptor.min) {
      errors[path] = { message: `Path \`${path}\` must be at least ${descriptor.min}.` }
    }
    if (descriptor.max != null && typeof value === 'number' && value > descriptor.max) {
      errors[path] = { message: `Path \`${path}\` must be at most ${descriptor.max}.` }
    }
    if (descriptor.kind === 'array' && Array.isArray(value) && descriptor.of?.kind === 'subdocument') {
      value.forEach((item, index) => {
        if (isPlainObject(item)) validateDocument(descriptor.of.schema.paths, item, errors, `${path}.${index}`)
      })
    }
    if (descriptor.kind === 'subdocument' && isPlainObject(value)) {
      validateDocument(descriptor.schema.paths, value, errors, path)
    }
  }
  return errors
}

/* ══════════════════════════════ Query matching ══════════════════════════════ */

function looseEquals(a, b) {
  if (a instanceof ObjectId || b instanceof ObjectId) {
    const left = a == null ? a : String(a)
    const right = b == null ? b : String(b)
    return left === right
  }
  if (a instanceof Date || b instanceof Date) {
    const left = a instanceof Date ? a.getTime() : new Date(a).getTime()
    const right = b instanceof Date ? b.getTime() : new Date(b).getTime()
    return left === right
  }
  if (Array.isArray(a) && !Array.isArray(b)) return a.some((item) => looseEquals(item, b))
  return a === b
}

function compare(a, b) {
  if (a == null || b == null) return a == null && b == null ? 0 : a == null ? -1 : 1
  const left = a instanceof Date ? a.getTime() : a instanceof ObjectId ? a.hex : a
  const right = b instanceof Date ? b.getTime() : b instanceof ObjectId ? b.hex : b
  if (typeof left === 'number' && typeof right === 'number') return left - right
  if (typeof left === 'boolean' || typeof right === 'boolean') return Number(left) - Number(right)
  return String(left).localeCompare(String(right))
}

function matchValue(actual, condition) {
  if (condition instanceof RegExp) return typeof actual === 'string' && condition.test(actual)
  if (condition == null) return actual == null
  if (isPlainObject(condition)) {
    const operators = Object.keys(condition).filter((k) => k.startsWith('$'))
    if (operators.length === 0) {
      // exact-object condition (rare) — compare via JSON-ish deep equality on shared keys
      return Object.entries(condition).every(([k, v]) => looseEquals(actual?.[k], v))
    }
    for (const [op, operand] of Object.entries(condition)) {
      switch (op) {
        case '$eq':
          if (!looseEquals(actual, operand)) return false
          break
        case '$ne':
          if (looseEquals(actual, operand)) return false
          break
        case '$in':
          if (!Array.isArray(operand) || !operand.some((v) => looseEquals(actual, v))) return false
          break
        case '$nin':
          if (Array.isArray(operand) && operand.some((v) => looseEquals(actual, v))) return false
          break
        case '$gt':
          if (!(compare(actual, operand) > 0)) return false
          break
        case '$gte':
          if (!(compare(actual, operand) >= 0)) return false
          break
        case '$lt':
          if (!(compare(actual, operand) < 0)) return false
          break
        case '$lte':
          if (!(compare(actual, operand) <= 0)) return false
          break
        case '$exists':
          if (Boolean(operand) !== (actual !== undefined && actual !== null)) return false
          break
        case '$regex': {
          const flags = condition.$options || (operand instanceof RegExp ? operand.flags : '')
          const source = operand instanceof RegExp ? operand.source : String(operand)
          const regex = new RegExp(source, flags)
          if (!regex.test(String(actual ?? ''))) return false
          break
        }
        case '$all':
          if (!Array.isArray(actual) || !operand.every((v) => actual.some((item) => looseEquals(item, v)))) return false
          break
        case '$size':
          if (!Array.isArray(actual) || actual.length !== operand) return false
          break
        case '$not':
          if (matchValue(actual, operand)) return false
          break
        default:
          break
      }
    }
    return true
  }
  if (Array.isArray(actual) && !Array.isArray(condition)) return actual.some((item) => looseEquals(item, condition))
  return looseEquals(actual, condition)
}

/** Cast a query filter using the schema so `{ code: 'abc' }` matches `ABC`. */
function castFilter(filter, paths) {
  if (!filter || typeof filter !== 'object') return filter
  const out = {}

  const castLeaf = (value, descriptor) => {
    if (value == null) return value
    if (value instanceof RegExp) return value
    if (Array.isArray(value)) return value.map((v) => castLeaf(v, descriptor))
    if (isPlainObject(value)) {
      const keys = Object.keys(value)
      if (keys.some((k) => k.startsWith('$'))) {
        const next = {}
        for (const [k, v] of Object.entries(value)) next[k] = castLeaf(v, descriptor)
        return next
      }
      return value
    }
    return descriptor ? castValue(descriptor, value) : value
  }

  for (const [key, value] of Object.entries(filter)) {
    if (key === '$or' || key === '$and' || key === '$nor') {
      out[key] = Array.isArray(value) ? value.map((sub) => castFilter(sub, paths)) : value
      continue
    }
    const descriptor = paths[key] || (key === '_id' ? { kind: 'primitive', type: ObjectId } : null)
    out[key] = castLeaf(value, descriptor)
  }
  return out
}

function matchesFilter(doc, filter = {}) {
  for (const [key, condition] of Object.entries(filter || {})) {
    if (key === '$or') {
      if (!condition.some((sub) => matchesFilter(doc, sub))) return false
      continue
    }
    if (key === '$and') {
      if (!condition.every((sub) => matchesFilter(doc, sub))) return false
      continue
    }
    if (key === '$nor') {
      if (condition.some((sub) => matchesFilter(doc, sub))) return false
      continue
    }
    if (key === '$expr') continue
    if (!matchValue(getPath(doc, key), condition)) return false
  }
  return true
}

function sortDocs(docs, spec) {
  if (!spec) return docs
  const entries = Object.entries(spec)
  return docs.sort((a, b) => {
    for (const [key, dir] of entries) {
      const result = compare(getPath(a, key), getPath(b, key))
      if (result !== 0) return result * (Number(dir) < 0 ? -1 : 1)
    }
    return 0
  })
}

/* ══════════════════════════════ Updates ══════════════════════════════ */

function applyUpdate(raw, update = {}) {
  const hasOperators = Object.keys(update).some((k) => k.startsWith('$'))
  const operations = hasOperators ? update : { $set: update }

  for (const [op, payload] of Object.entries(operations)) {
    switch (op) {
      case '$set':
        for (const [key, value] of Object.entries(payload)) setPath(raw, key, value)
        break
      case '$unset':
        for (const key of Object.keys(payload)) {
          const parts = String(key).split('.')
          let node = raw
          for (let i = 0; i < parts.length - 1; i++) node = node?.[parts[i]] || {}
          if (node) delete node[parts[parts.length - 1]]
        }
        break
      case '$inc':
        for (const [key, amount] of Object.entries(payload)) setPath(raw, key, (Number(getPath(raw, key)) || 0) + Number(amount))
        break
      case '$mul':
        for (const [key, amount] of Object.entries(payload)) setPath(raw, key, (Number(getPath(raw, key)) || 0) * Number(amount))
        break
      case '$min':
        for (const [key, value] of Object.entries(payload)) {
          if (getPath(raw, key) == null || Number(getPath(raw, key)) > Number(value)) setPath(raw, key, value)
        }
        break
      case '$max':
        for (const [key, value] of Object.entries(payload)) {
          if (getPath(raw, key) == null || Number(getPath(raw, key)) < Number(value)) setPath(raw, key, value)
        }
        break
      case '$push':
        for (const [key, value] of Object.entries(payload)) {
          const list = getPath(raw, key) || []
          const additions = isPlainObject(value) && Array.isArray(value.$each) ? value.$each : [value]
          setPath(raw, key, [...list, ...additions])
        }
        break
      case '$addToSet':
        for (const [key, value] of Object.entries(payload)) {
          const list = getPath(raw, key) || []
          const additions = isPlainObject(value) && Array.isArray(value.$each) ? value.$each : [value]
          const next = [...list]
          for (const item of additions) if (!next.some((existing) => looseEquals(existing, item))) next.push(item)
          setPath(raw, key, next)
        }
        break
      case '$pull':
        for (const [key, condition] of Object.entries(payload)) {
          const list = getPath(raw, key) || []
          setPath(
            raw,
            key,
            list.filter((item) => !matchValue(item, condition)),
          )
        }
        break
      default:
        break
    }
  }
  return raw
}

/* ══════════════════════════════ Storage ══════════════════════════════ */

class Store {
  constructor(file) {
    this.file = file
    fs.mkdirSync(path.dirname(file), { recursive: true })
    this.db = new DatabaseSync(file)
    this.db.exec('PRAGMA journal_mode = WAL')
    this.db.exec('PRAGMA synchronous = NORMAL')
    this.statements = new Map()
    this.collections = new Map() // collection -> Map(id -> raw doc)
  }

  table(collection) {
    if (!this.tables) this.tables = new Set()
    if (!this.tables.has(collection)) {
      this.db.exec(`CREATE TABLE IF NOT EXISTS "${collection}" (id TEXT PRIMARY KEY, doc TEXT NOT NULL)`)
      this.tables.add(collection)
    }
    return collection
  }

  statement(collection, sql) {
    const key = `${collection}:${sql}`
    if (!this.statements.has(key)) this.statements.set(key, this.db.prepare(sql))
    return this.statements.get(key)
  }

  load(collection) {
    if (this.collections.has(collection)) return this.collections.get(collection)
    this.table(collection)
    const rows = this.db.prepare(`SELECT id, doc FROM "${collection}"`).all()
    const map = new Map()
    for (const row of rows) {
      try {
        map.set(row.id, JSON.parse(row.doc))
      } catch {
        /* corrupted row — skip */
      }
    }
    this.collections.set(collection, map)
    return map
  }

  save(collection, id, doc) {
    const map = this.load(collection)
    map.set(id, doc)
    this.statement(collection, `INSERT INTO "${collection}" (id, doc) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET doc = excluded.doc`).run(
      id,
      JSON.stringify(doc),
    )
  }

  remove(collection, id) {
    this.load(collection).delete(id)
    this.statement(collection, `DELETE FROM "${collection}" WHERE id = ?`).run(id)
  }
}

let store = null
let databasePath = null

function getStore() {
  if (!store) throw new Error('Database not connected — call mongoose.connect() first')
  return store
}

/* ══════════════════════════════ Document ══════════════════════════════ */

const RESERVED = new Set(['$model', '$raw', '$isNew', '$projection', '$populated', 'save', 'toObject', 'toJSON', 'remove', 'populate', 'set', 'get', '_id', 'id', 'schema', 'constructor', 'isNew'])

class LiteDocument {
  constructor(model, raw, options = {}) {
    this.$model = model
    this.$raw = raw
    this.$isNew = Boolean(options.isNew)
    this.$projection = options.projection || null
    this.$populated = options.populated || {}
    return new Proxy(this, documentHandler)
  }

  get _id() {
    return this.$raw._id
  }

  set _id(value) {
    this.$raw._id = value instanceof ObjectId ? value : new ObjectId(value)
  }

  get id() {
    return this.$raw._id ? String(this.$raw._id) : undefined
  }

  get schema() {
    return this.$model.schema
  }

  get isNew() {
    return this.$isNew
  }

  set(path, value) {
    if (isPlainObject(path)) Object.assign(this.$raw, path)
    else setPath(this.$raw, path, value)
    return this
  }

  get(path) {
    return getPath(this.$raw, path)
  }

  async save() {
    const model = this.$model
    const raw = this.$raw
    if (!raw._id) raw._id = new ObjectId()

    castDocument(model.schema.paths, raw)
    applyDefaults({ fields: model.schema.paths }, raw)
    if (model.schema.options.timestamps) {
      const now = new Date()
      if (!raw.createdAt) raw.createdAt = now
      raw.updatedAt = raw.updatedAt && !this.$isNew ? now : raw.updatedAt || now
    }
    const errors = validateDocument(model.schema.paths, raw)
    if (Object.keys(errors).length) throw new ValidationError(errors)
    await model.$enforceUnique(raw)

    getStore().save(model.collection, String(raw._id), raw)
    this.$isNew = false
    return this
  }

  async remove() {
    await this.$model.deleteOne({ _id: this.$raw._id })
    return this
  }

  async deleteOne() {
    return this.remove()
  }

  async delete() {
    return this.remove()
  }

  toObject({ projection = this.$projection } = {}) {
    const plain = clone(this.$raw)
    return applyProjection(plain, projection)
  }

  toJSON() {
    const plain = clone(this.$raw)
    const projected = applyProjection(plain, this.$projection)
    return toPlainJson(projected)
  }

  async populate(path) {
    return this.$model.$populateDoc(this, path)
  }

  toString() {
    return JSON.stringify(this.toJSON())
  }
}

const documentHandler = {
  get(target, prop) {
    if (typeof prop === 'symbol') return Reflect.get(target, prop)
    const projection = target.$projection
    if (projection && typeof prop === 'string') {
      if (projection.mode === 'exclude' && projection.fields.has(prop)) return undefined
      if (projection.mode === 'include' && !projection.fields.has(prop) && prop !== '_id') return undefined
    }
    if (prop in target.$raw && !RESERVED.has(prop)) {
      const value = target.$raw[prop]
      if (value !== undefined) return value
    }
    if (prop in target) return Reflect.get(target, prop)
    return target.$raw[prop]
  },
  set(target, prop, value) {
    if (typeof prop === 'symbol' || RESERVED.has(prop)) {
      Reflect.set(target, prop, value)
      return true
    }
    target.$raw[prop] = value
    return true
  },
  has(target, prop) {
    return prop in target.$raw || prop in target
  },
  deleteProperty(target, prop) {
    delete target.$raw[prop]
    return true
  },
  ownKeys(target) {
    return Reflect.ownKeys(target.$raw)
  },
  getOwnPropertyDescriptor(target, prop) {
    if (prop in target.$raw) return Reflect.getOwnPropertyDescriptor(target.$raw, prop)
    return Reflect.getOwnPropertyDescriptor(target, prop)
  },
}

function applyProjection(raw, projection) {
  if (!projection) return raw
  if (projection.mode === 'include') {
    const out = {}
    for (const key of Object.keys(raw)) if (projection.fields.has(key)) out[key] = raw[key]
    if (!projection.fields.has('_id') === false) out._id = raw._id
    return out
  }
  for (const field of projection.fields) delete raw[field]
  return raw
}

function toPlainJson(value) {
  if (value == null) return value
  if (value instanceof ObjectId) return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(toPlainJson)
  if (isPlainObject(value)) {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = toPlainJson(v)
    return out
  }
  return value
}

/* ══════════════════════════════ Query ══════════════════════════════ */

class Query {
  constructor(model, operation, args = {}) {
    this.$model = model
    this.$operation = operation
    this.$filter = args.filter || {}
    this.$update = args.update
    this.$options = args.options || {}
    this.$sortSpec = args.sort
    this.$limitCount = args.limit
    this.$skipCount = args.skip
    this.$projection = null
    this.$populatePaths = []
    this.$lean = false
  }

  where(filter) {
    this.$filter = { ...this.$filter, ...filter }
    return this
  }

  sort(spec) {
    this.$sortSpec = spec
    return this
  }

  limit(n) {
    this.$limitCount = n
    return this
  }

  skip(n) {
    this.$skipCount = n
    return this
  }

  select(spec) {
    if (spec == null) return this
    const fields = new Set(
      String(spec)
        .split(/\s+/)
        .map((f) => f.trim())
        .filter(Boolean),
    )
    const mode = [...fields].some((f) => f.startsWith('-')) ? 'exclude' : 'include'
    this.$projection = { mode, fields: new Set([...fields].map((f) => (f.startsWith('-') ? f.slice(1) : f))) }
    return this
  }

  populate(path) {
    this.$populatePaths.push(...String(path).split(/\s+/).filter(Boolean))
    return this
  }

  lean(value = true) {
    this.$lean = value
    return this
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject)
  }

  catch(reject) {
    return this.exec().catch(reject)
  }

  finally(callback) {
    return this.exec().finally(callback)
  }

  async exec() {
    const model = this.$model
    switch (this.$operation) {
      case 'find': {
        let docs = await model.$findRaw(this.$filter)
        docs = sortDocs(docs, this.$sortSpec)
        if (this.$skipCount) docs = docs.slice(this.$skipCount)
        if (this.$limitCount) docs = docs.slice(0, this.$limitCount)
        let result = await Promise.all(docs.map((raw) => model.$hydrate(raw, { projection: this.$projection })))
        for (const path of this.$populatePaths) result = await Promise.all(result.map((doc) => model.$populateDoc(doc, path)))
        return this.$lean ? result.map((d) => d.toObject()) : result
      }
      case 'findOne': {
        const docs = sortDocs(await model.$findRaw(this.$filter), this.$sortSpec)
        const raw = docs[0]
        if (!raw) return null
        let doc = await model.$hydrate(raw, { projection: this.$projection })
        for (const path of this.$populatePaths) doc = await model.$populateDoc(doc, path)
        return this.$lean ? doc.toObject() : doc
      }
      case 'count':
        return (await model.$findRaw(this.$filter)).length
      case 'distinct': {
        const docs = await model.$findRaw(this.$filter)
        return [...new Set(docs.map((doc) => getPath(doc, this.$options.field)).filter((v) => v != null))]
      }
      case 'updateOne':
      case 'updateMany': {
        const docs = await model.$findRaw(this.$filter)
        const targets = this.$operation === 'updateOne' ? docs.slice(0, 1) : docs
        for (const raw of targets) {
          applyUpdate(raw, this.$update)
          await model.$persist(raw)
        }
        return { acknowledged: true, matchedCount: docs.length, modifiedCount: targets.length, upsertedCount: 0 }
      }
      case 'deleteOne':
      case 'deleteMany': {
        const docs = await model.$findRaw(this.$filter)
        const targets = this.$operation === 'deleteOne' ? docs.slice(0, 1) : docs
        for (const raw of targets) model.$destroy(raw)
        return { acknowledged: true, deletedCount: targets.length }
      }
      case 'findOneAndUpdate':
      case 'findByIdAndUpdate': {
        const docs = sortDocs(await model.$findRaw(this.$filter), this.$sortSpec)
        let raw = docs[0]
        if (!raw && this.$options.upsert) {
          raw = { _id: new ObjectId(), ...buildFromFilter(this.$filter) }
          applyDefaults({ fields: model.schema.paths }, raw)
          model.$insert(raw, { isNew: true })
          applyUpdate(raw, this.$update)
          await model.$persist(raw)
          const doc = await model.$hydrate(raw, { projection: this.$projection, isNew: true })
          return this.$lean ? doc.toObject() : doc
        }
        if (!raw) return null
        applyUpdate(raw, this.$update)
        await model.$persist(raw)
        const wantsNew = this.$options.new === true || this.$options.returnDocument === 'after'
        const doc = await model.$hydrate(raw, { projection: this.$projection, isNew: !wantsNew })
        return this.$lean ? doc.toObject() : doc
      }
      default:
        throw new Error(`Unsupported query operation: ${this.$operation}`)
    }
  }
}

function buildFromFilter(filter = {}) {
  const out = {}
  for (const [key, value] of Object.entries(filter)) {
    if (key.startsWith('$')) continue
    if (isPlainObject(value) && Object.keys(value).some((k) => k.startsWith('$'))) continue
    setPath(out, key, value)
  }
  return out
}

/* ══════════════════════════════ Aggregation ══════════════════════════════ */

function resolveExpression(doc, expression) {
  if (typeof expression === 'string') return expression.startsWith('$') ? getPath(doc, expression.slice(1)) : expression
  if (isPlainObject(expression)) {
    const [op, operand] = Object.entries(expression)[0] || []
    switch (op) {
      case '$sum': {
        if (typeof operand === 'number') return operand
        if (Array.isArray(operand)) return operand.reduce((sum, item) => sum + (Number(resolveExpression(doc, item)) || 0), 0)
        const list = resolveExpression(doc, operand)
        return Array.isArray(list) ? list.reduce((s, v) => s + (Number(v) || 0), 0) : Number(list) || 0
      }
      case '$avg': {
        const list = resolveExpression(doc, operand)
        if (!Array.isArray(list) || !list.length) return null
        return list.reduce((s, v) => s + (Number(v) || 0), 0) / list.length
      }
      case '$multiply':
        return operand.reduce((acc, item) => acc * (Number(resolveExpression(doc, item)) || 0), 1)
      case '$divide':
        return (Number(resolveExpression(doc, operand[0])) || 0) / (Number(resolveExpression(doc, operand[1])) || 1)
      case '$subtract':
        return (Number(resolveExpression(doc, operand[0])) || 0) - (Number(resolveExpression(doc, operand[1])) || 0)
      case '$add':
        return operand.reduce((acc, item) => acc + (Number(resolveExpression(doc, item)) || 0), 0)
      case '$ifNull':
        return resolveExpression(doc, operand[0]) ?? resolveExpression(doc, operand[1])
      case '$toLower':
        return String(resolveExpression(doc, operand) ?? '').toLowerCase()
      case '$concat':
        return operand.map((item) => String(resolveExpression(doc, item) ?? '')).join('')
      case '$literal':
        return operand
      default:
        return null
    }
  }
  return expression
}

function applyGroupAccumulator(current, op, expression, doc) {
  switch (op) {
    case '$sum': {
      if (typeof expression === 'number') return (current || 0) + expression
      if (expression === '$$ROOT') return (current || 0) + 1
      const value = getPath(doc, String(expression).replace(/^\$/, ''))
      if (Array.isArray(value)) return (current || 0) + value.reduce((s, v) => s + (Number(v) || 0), 0)
      if (expression && String(expression).startsWith('$') && String(expression).includes('.')) {
        // e.g. $sum over an array field of objects handled above
      }
      return (current || 0) + (Number(value) || 0)
    }
    case '$avg': {
      const value = Number(getPath(doc, String(expression).replace(/^\$/, ''))) || 0
      const state = current || { sum: 0, count: 0 }
      return { sum: state.sum + value, count: state.count + 1 }
    }
    case '$count':
      return (current || 0) + 1
    case '$min': {
      const value = getPath(doc, String(expression).replace(/^\$/, ''))
      return current == null || compare(value, current) < 0 ? value : current
    }
    case '$max': {
      const value = getPath(doc, String(expression).replace(/^\$/, ''))
      return current == null || compare(value, current) > 0 ? value : current
    }
    case '$first':
      return current === undefined ? getPath(doc, String(expression).replace(/^\$/, '')) : current
    case '$last':
      return getPath(doc, String(expression).replace(/^\$/, ''))
    case '$push': {
      const list = current || []
      const value = expression === '$$ROOT' ? clone(doc) : getPath(doc, String(expression).replace(/^\$/, ''))
      list.push(value)
      return list
    }
    case '$addToSet': {
      const list = current || []
      const value = getPath(doc, String(expression).replace(/^\$/, ''))
      if (!list.some((item) => looseEquals(item, value))) list.push(value)
      return list
    }
    default:
      return current
  }
}

function finalizeAccumulator(state, op) {
  if (op === '$avg') return state && state.count ? state.sum / state.count : null
  return state
}

function runAggregate(rows, pipeline, registry) {
  let docs = rows.map(clone)

  for (const stage of pipeline) {
    const [op, payload] = Object.entries(stage)[0]
    switch (op) {
      case '$match':
        docs = docs.filter((doc) => matchesFilter(doc, payload))
        break
      case '$sort':
        docs = sortDocs(docs, payload)
        break
      case '$limit':
        docs = docs.slice(0, payload)
        break
      case '$skip':
        docs = docs.slice(payload)
        break
      case '$unwind': {
        const field = String(payload).replace(/^\$/, '')
        const next = []
        for (const doc of docs) {
          const value = getPath(doc, field)
          if (Array.isArray(value)) value.forEach((item) => next.push({ ...clone(doc), [field]: item }))
          else if (value !== undefined) next.push(doc)
        }
        docs = next
        break
      }
      case '$project': {
        docs = docs.map((doc) => {
          const out = {}
          for (const [key, expression] of Object.entries(payload)) {
            if (expression === 1 || expression === true) out[key] = getPath(doc, key)
            else if (expression === 0 || expression === false) delete out[key]
            else out[key] = resolveExpression(doc, expression)
          }
          return out
        })
        break
      }
      case '$group': {
        const groups = new Map()
        for (const doc of docs) {
          const key = payload._id == null ? null : resolveExpression(doc, payload._id)
          const keyString = key == null ? '__null__' : key instanceof ObjectId ? key.hex : String(key)
          if (!groups.has(keyString)) groups.set(keyString, { key, state: {} })
          const group = groups.get(keyString)
          for (const [field, spec] of Object.entries(payload)) {
            if (field === '_id') continue
            const [accOp, accExpr] = Object.entries(spec)[0]
            group.state[field] = applyGroupAccumulator(group.state[field], accOp, accExpr, doc)
          }
        }
        docs = [...groups.values()].map(({ key, state }) => {
          const out = { _id: key }
          for (const [field, spec] of Object.entries(payload)) {
            if (field === '_id') continue
            const [accOp] = Object.entries(spec)[0]
            out[field] = finalizeAccumulator(state[field], accOp)
          }
          return out
        })
        break
      }
      case '$lookup': {
        const foreign = registry?.[payload.from]
        if (foreign) {
          const lookupDocs = foreign
          docs = docs.map((doc) => {
            const local = getPath(doc, payload.localField)
            const matches = lookupDocs.filter((foreignDoc) => looseEquals(getPath(foreignDoc, payload.foreignField), local))
            return { ...doc, [payload.as]: matches.map(clone) }
          })
        }
        break
      }
      case '$addFields':
      case '$set':
        docs = docs.map((doc) => {
          for (const [key, expression] of Object.entries(payload)) setPath(doc, key, resolveExpression(doc, expression))
          return doc
        })
        break
      case '$count':
        docs = [{ [payload]: docs.length }]
        break
      default:
        break
    }
  }
  return docs
}

class Aggregate {
  constructor(model, pipeline) {
    this.$model = model
    this.$pipeline = pipeline
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject)
  }

  async exec() {
    const rows = await this.$model.$findRaw({})
    return runAggregate(rows, this.$pipeline, registry())
  }
}

/* ══════════════════════════════ Model ══════════════════════════════ */

const models = new Map()

function createModel(name, schema, collection) {
  const collectionName = collection || schema?.options?.collection || pluralize(name)

  class Model {
    constructor(doc = {}) {
      const raw = clone(doc) || {}
      if (!raw._id) raw._id = new ObjectId()
      return new LiteDocument(Model, raw, { isNew: true })
    }

    /* —— internals —— */
    static async $findRaw(filter) {
      const map = getStore().load(collectionName)
      const rows = reviveAll([...map.values()], schema)
      const casted = castFilter(filter, schema.paths)
      return rows.filter((row) => matchesFilter(row, casted))
    }

    static $insert(raw, options = {}) {
      const map = getStore().load(collectionName)
      map.set(String(raw._id), raw)
      if (options.persist !== false) getStore().save(collectionName, String(raw._id), raw)
      return raw
    }

    static $destroy(raw) {
      getStore().remove(collectionName, String(raw._id))
    }

    static async $persist(raw) {
      applyDefaults({ fields: schema.paths }, raw)
      castDocument(schema.paths, raw)
      if (schema.options.timestamps) raw.updatedAt = new Date()
      const errors = validateDocument(schema.paths, raw)
      if (Object.keys(errors).length) throw new ValidationError(errors)
      getStore().save(collectionName, String(raw._id), raw)
      return raw
    }

    static async $enforceUnique(raw) {
      for (const [key, descriptor] of Object.entries(schema.paths)) {
        if (!descriptor.unique) continue
        const value = getPath(raw, key)
        if (value == null) continue
        const map = getStore().load(collectionName)
        for (const [id, existing] of map) {
          if (id === String(raw._id)) continue
          const other = hydrateRaw(existing, schema)
          if (looseEquals(getPath(other, key), value)) {
            const err = new Error(`E11000 duplicate key error collection: ${collectionName} index: ${key}_1 dup key: ${value}`)
            err.code = 11000
            throw err
          }
        }
      }
    }

    static $hydrate(raw, options = {}) {
      return new LiteDocument(Model, raw, options)
    }

    static async $populateDoc(doc, path) {
      const descriptor = schema.paths[path]
      if (!descriptor?.ref) return doc
      const target = models.get(descriptor.ref)
      if (!target) return doc
      const value = doc[path]
      if (value == null) return doc
      if (Array.isArray(value)) {
        doc.$raw[path] = await Promise.all(value.map((id) => target.findById(id)))
      } else {
        doc.$raw[path] = await target.findById(value)
      }
      return doc
    }

    /* —— public API —— */
    static get schema() {
      return schema
    }

    static get modelName() {
      return name
    }

    static get collection() {
      return collectionName
    }

    static find(filter = {}) {
      return new Query(Model, 'find', { filter })
    }

    static findOne(filter = {}) {
      return new Query(Model, 'findOne', { filter })
    }

    static findById(id) {
      if (id == null) return new Query(Model, 'findOne', { filter: { _id: null } })
      return new Query(Model, 'findOne', { filter: { _id: id instanceof ObjectId ? id : new ObjectId(id) } })
    }

    static countDocuments(filter = {}) {
      return new Query(Model, 'count', { filter })
    }

    static count(filter = {}) {
      return new Query(Model, 'count', { filter })
    }

    static exists(filter = {}) {
      return new Query(Model, 'count', { filter }).exec().then((n) => n > 0)
    }

    static distinct(field, filter = {}) {
      return new Query(Model, 'distinct', { filter, options: { field } })
    }

    static aggregate(pipeline = []) {
      return new Aggregate(Model, pipeline)
    }

    static updateOne(filter, update, options) {
      return new Query(Model, 'updateOne', { filter, update, options })
    }

    static updateMany(filter, update, options) {
      return new Query(Model, 'updateMany', { filter, update, options })
    }

    static deleteOne(filter) {
      return new Query(Model, 'deleteOne', { filter })
    }

    static deleteMany(filter = {}) {
      return new Query(Model, 'deleteMany', { filter })
    }

    static findOneAndUpdate(filter, update, options = {}) {
      return new Query(Model, 'findOneAndUpdate', { filter, update, options })
    }

    static findByIdAndUpdate(id, update, options = {}) {
      return new Query(Model, 'findByIdAndUpdate', {
        filter: { _id: id instanceof ObjectId ? id : new ObjectId(id) },
        update,
        options,
      })
    }

    static findByIdAndDelete(id) {
      return new Query(Model, 'deleteOne', { filter: { _id: id instanceof ObjectId ? id : new ObjectId(id) } })
    }

    static async insertMany(docs = []) {
      const created = []
      for (const doc of docs) created.push(await Model.create(doc))
      return created
    }

    static async create(...docs) {
      const input = docs.length === 1 && Array.isArray(docs[0]) ? docs[0] : docs
      const created = []
      for (const item of input) {
        const document = new Model(item)
        await document.save()
        created.push(document)
      }
      return created.length === 1 ? created[0] : created
    }
  }

  Object.defineProperty(Model, 'name', { value: name })
  models.set(name, Model)
  return Model
}

function hydrateRaw(raw, schema) {
  const doc = clone(raw)
  for (const [key, descriptor] of Object.entries(schema.paths)) {
    const value = getPath(doc, key)
    if (value === undefined || value === null) continue
    if (descriptor.type === Date || (descriptor.kind === 'primitive' && descriptor.type === Date)) {
      const date = value instanceof Date ? value : new Date(value)
      if (!Number.isNaN(date.getTime())) setPath(doc, key, date)
    } else if (descriptor.type === ObjectId) {
      if (Array.isArray(value)) setPath(doc, key, value.filter((v) => v != null).map((v) => (v instanceof ObjectId ? v : new ObjectId(v))))
      else if (!(value instanceof ObjectId) && ObjectId.isValid(value)) setPath(doc, key, new ObjectId(value))
    } else if (descriptor.kind === 'array' && descriptor.of?.type === ObjectId && Array.isArray(value)) {
      setPath(doc, key, value.filter((v) => v != null).map((v) => (v instanceof ObjectId ? v : new ObjectId(v))))
    } else if (descriptor.kind === 'array' && descriptor.of?.kind === 'subdocument' && Array.isArray(value)) {
      setPath(
        doc,
        key,
        value.map((item) => hydrateRaw(item, descriptor.of.schema)),
      )
    } else if (descriptor.kind === 'subdocument' && isPlainObject(value)) {
      setPath(doc, key, hydrateRaw(value, descriptor.schema))
    }
  }
  if (ObjectId.isValid(doc._id)) doc._id = new ObjectId(doc._id)
  return doc
}

function reviveAll(rows, schema) {
  return rows.map((row) => hydrateRaw(row, schema))
}

function registry() {
  const out = {}
  for (const [name, model] of models) out[model.collection] = [...getStore().load(model.collection).values()].map((raw) => hydrateRaw(raw, model.schema))
  void out
  return out
}

/* ══════════════════════════════ Connection ══════════════════════════════ */

export const connection = {
  name: 'ember-sage',
  readyState: 0,
  get db() {
    return { databaseName: connection.name }
  },
}

export async function connect(uri = '', options = {}) {
  databasePath = resolveDatabasePath(uri)
  store = new Store(databasePath)
  connection.readyState = 1
  connection.name = path.basename(databasePath, path.extname(databasePath))
  console.log(`[db] sqlite connected → ${databasePath}`)
  return exports_mongoose
}

function resolveDatabasePath(uri) {
  const fromUri = String(uri).replace(/^sqlite:\/\//, '').replace(/^sqlite:/, '')
  if (fromUri && !fromUri.startsWith('mongodb')) return path.resolve(fromUri)
  return path.resolve(__dirname, '../../../.data/ember-sage.sqlite')
}

export async function disconnect() {
  if (store?.db) store.db.close()
  store = null
  connection.readyState = 0
}

export function model(name, schema, collection) {
  return createModel(name, schema, collection)
}

const exports_mongoose = {
  Schema,
  Types,
  ObjectId,
  model,
  models,
  connect,
  disconnect,
  connection,
  Error: { ValidationError, CastError: class CastError extends Error {} },
}

export { createModel, ValidationError }
export const models_ = models
export default exports_mongoose
