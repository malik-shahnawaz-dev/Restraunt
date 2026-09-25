import { connect, disconnect, connection, DB_ENGINE } from '../db/orm.js'

/**
 * Connects the API to its database.
 *
 *  • `MONGODB_URI` set  → Mongoose/MongoDB (production, e.g. Atlas)
 *  • otherwise         → the built-in SQLite store at `SQLITE_PATH`
 *    (defaults to `.data/ember-sage.sqlite` inside the app folder)
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI || process.env.SQLITE_PATH || ''
  await connect(uri)
  console.log(`[db] engine=${DB_ENGINE} database=${connection.name}`)
}

export async function disconnectDB() {
  await disconnect()
}
