import test from "node:test"
import assert from "node:assert/strict"

import { pickClientIp } from "../src/lib/client-ip"

test("a single forwarded address is the visitor", () => {
  assert.equal(pickClientIp("203.0.113.7", null), "203.0.113.7")
})

test("with a chain, the address added by the nearest proxy wins, not one the visitor wrote", () => {
  assert.equal(pickClientIp("1.2.3.4, 203.0.113.7", null), "203.0.113.7")
  assert.equal(pickClientIp(" 1.2.3.4 ,203.0.113.7 ", null), "203.0.113.7")
})

test("X-Real-IP is used only when there is no forwarded chain", () => {
  assert.equal(pickClientIp(null, "198.51.100.2"), "198.51.100.2")
  assert.equal(pickClientIp("", " 198.51.100.2 "), "198.51.100.2")
  assert.equal(pickClientIp("203.0.113.7", "198.51.100.2"), "203.0.113.7")
})

test("with no proxy headers there is no address to pass on", () => {
  assert.equal(pickClientIp(null, null), null)
  assert.equal(pickClientIp(" , ", ""), null)
})
