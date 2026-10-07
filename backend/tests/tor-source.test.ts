import test from "node:test"
import assert from "node:assert/strict"
import { resolveTorSource } from "../src/domain/tor-source"

test("a stored source is used as is", () => {
  assert.equal(resolveTorSource({ source: "seed", sourceUrl: "https://x.go.th/a" }), "seed")
  assert.equal(resolveTorSource({ source: "egp-rss", sourceUrl: "https://www.gprocurement.go.th" }), "egp-rss")
})

test("a TOR stored before the field existed is told apart by its portal front-page link", () => {
  assert.equal(resolveTorSource({ sourceUrl: "https://www.gprocurement.go.th" }), "seed")
  assert.equal(resolveTorSource({ sourceUrl: "https://www.gprocurement.go.th/" }), "seed")
  assert.equal(resolveTorSource({ sourceUrl: "https://process5.gprocurement.go.th/egp/doc.pdf" }), "egp-rss")
  assert.equal(resolveTorSource({ sourceUrl: "" }), "egp-rss")
})

test("an unknown stored value falls back to inference rather than leaking through", () => {
  assert.equal(resolveTorSource({ source: "carrier-pigeon", sourceUrl: "https://www.gprocurement.go.th" }), "seed")
})
