import mongoose from 'mongoose'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.resolve(__dirname, '../../../.data/mongodb')

let memoryServer = null

export async function connectDB() {
  let uri = process.env.MONGODB_URI

  if (!uri) {
    const { default: fs } = await import('node:fs')
    fs.mkdirSync(DB_PATH, { recursive: true })
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    memoryServer = await MongoMemoryServer.create({
      instance: { dbPath: DB_PATH, storageEngine: 'wiredTiger' },
    })
    uri = memoryServer.getUri()
    console.log('[db] using persistent local MongoDB at', DB_PATH)
  }

  await mongoose.connect(uri)
  console.log('[db] connected:', mongoose.connection.name)
  return memoryServer
}

export async function disconnectDB() {
  await mongoose.disconnect()
  if (memoryServer) await memoryServer.stop()
}
