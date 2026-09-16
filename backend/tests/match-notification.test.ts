import test from "node:test"
import assert from "node:assert/strict"
import { selectNewMatches } from "../src/services/match-notification.service"

test("selectNewMatches only returns eligible TORs the user was not already notified about", () => {
  assert.deepEqual(selectNewMatches(["a", "b", "c"], ["b"]), ["a", "c"])
})

test("selectNewMatches returns nothing when every eligible TOR was already notified", () => {
  assert.deepEqual(selectNewMatches(["a", "b"], ["a", "b", "z"]), [])
})

test("selectNewMatches returns everything when nothing was notified yet", () => {
  assert.deepEqual(selectNewMatches(["a", "b"], []), ["a", "b"])
})

test("selectNewMatches is a no-op on an empty eligible list", () => {
  assert.deepEqual(selectNewMatches([], ["a"]), [])
})
