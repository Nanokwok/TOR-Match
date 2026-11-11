/**
 * Loaded before every test file (see the "test" script). config/env.ts refuses
 * to import without these, and a fresh checkout or CI has no .env. No test
 * talks to a database or signs anything that outlives the run.
 *
 * Plain JavaScript on purpose: node loads --import files before tsx's
 * TypeScript support is in place.
 */
import process from "node:process"

process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/unit-tests-unused"
process.env.JWT_SECRET ??= "unit-test-secret"
