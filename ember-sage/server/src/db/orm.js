/**
 * orm.js — single place that decides which database engine the app talks to.
 *
 * • `MONGODB_URI` present → real MongoDB through Mongoose (recommended in
 *   production, e.g. MongoDB Atlas).
 * • otherwise            → the embedded SQLite implementation in `lite.js`,
 *   which exposes the same Mongoose-shaped API so all models/routes work
 *   unchanged with zero external services.
 *
 * Everything the application uses must exist on BOTH implementations.
 */
import 'dotenv/config'

const useMongo = Boolean(process.env.MONGODB_URI)

let impl
let engine

if (useMongo) {
  const mongoose = (await import('mongoose')).default
  engine = 'mongodb'
  impl = {
    ...mongoose,
    Schema: mongoose.Schema,
    Types: mongoose.Types,
    model: mongoose.model.bind(mongoose),
    connect: (uri, options) => mongoose.connect(uri, options),
    disconnect: () => mongoose.disconnect(),
  }
} else {
  const lite = await import('./lite.js')
  engine = 'sqlite'
  impl = {
    ...lite.default,
    Schema: lite.Schema,
    Types: lite.Types,
    model: lite.model,
    connect: lite.connect,
    disconnect: lite.disconnect,
  }
}

export const DB_ENGINE = engine
export const Schema = impl.Schema
export const Types = impl.Types
export const ObjectId = impl.Types.ObjectId
export const model = impl.model
export const connection = impl.connection
export const connect = impl.connect
export const disconnect = impl.disconnect
export const mongoose = impl
export default impl
