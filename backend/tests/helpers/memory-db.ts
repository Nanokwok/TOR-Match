import mongoose from "mongoose"
import { MongoMemoryServer } from "mongodb-memory-server"

/**
 * A real MongoDB that lives for one test file: started on a free port, kept in
 * memory and thrown away afterwards. Tests that touch models use it instead of
 * mocking them, so the queries, the unique indexes and the defaults are the
 * ones production uses.
 *
 * The first run downloads a mongod binary (about 80 MB) and caches it.
 */
export async function startMemoryDb() {
  const server = await MongoMemoryServer.create()
  await mongoose.connect(server.getUri(), { dbName: "unit-tests" })
  // Unique indexes are built in the background; a test about a duplicate must not race them.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()))

  return {
    /** Empties every collection but keeps the indexes. */
    async clear() {
      await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})))
    },
    async stop() {
      await mongoose.disconnect()
      await server.stop()
    },
  }
}
