import { describe, test } from "node:test"
import assert from "node:assert/strict"
import { Commit } from "../src/commit.js"
import { xor } from "../src/xor.js"

describe("xor – basic cases", () => {
  test("all commits match → empty onlyInOurs, empty onlyInTheirs", () => {
    const ours = [
      new Commit({ hash: "a1", subject: "Fix login" }),
      new Commit({ hash: "a2", subject: "Add tests" })
    ]
    const theirs = [
      new Commit({ hash: "b1", subject: "Fix login" }),
      new Commit({ hash: "b2", subject: "Add tests" })
    ]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 2)
    assert.strictEqual(result.onlyInOurs.length, 0)
    assert.strictEqual(result.onlyInTheirs.length, 0)
    assert.strictEqual(result.matched[0][0].hash, "a1")
    assert.strictEqual(result.matched[0][1].hash, "b1")
    assert.strictEqual(result.matched[1][0].hash, "a2")
    assert.strictEqual(result.matched[1][1].hash, "b2")
  })

  test("no commits match → all in onlyInOurs, all in onlyInTheirs", () => {
    const ours = [new Commit({ hash: "a1", subject: "Fix login" })]
    const theirs = [new Commit({ hash: "b1", subject: "Add tests" })]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 0)
    assert.strictEqual(result.onlyInOurs.length, 1)
    assert.strictEqual(result.onlyInTheirs.length, 1)
    assert.strictEqual(result.onlyInOurs[0].hash, "a1")
    assert.strictEqual(result.onlyInTheirs[0].hash, "b1")
  })

  test("mixed: some match, some don't on each side", () => {
    const ours = [
      new Commit({ hash: "a1", subject: "Fix login" }),
      new Commit({ hash: "a2", subject: "Only ours" })
    ]
    const theirs = [
      new Commit({ hash: "b1", subject: "Fix login" }),
      new Commit({ hash: "b2", subject: "Only theirs" })
    ]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 1)
    assert.strictEqual(result.onlyInOurs.length, 1)
    assert.strictEqual(result.onlyInTheirs.length, 1)
    assert.strictEqual(result.onlyInOurs[0].hash, "a2")
    assert.strictEqual(result.onlyInTheirs[0].hash, "b2")
  })
})

describe("xor – duplicates", () => {
  test("two commits with same subject on ours, one on theirs → first matches, second is onlyInOurs", () => {
    const ours = [
      new Commit({ hash: "a1", subject: "Fix login" }),
      new Commit({ hash: "a2", subject: "Fix login" })
    ]
    const theirs = [new Commit({ hash: "b1", subject: "Fix login" })]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 1)
    assert.strictEqual(result.matched[0][0].hash, "a1")
    assert.strictEqual(result.matched[0][1].hash, "b1")
    assert.strictEqual(result.onlyInOurs.length, 1)
    assert.strictEqual(result.onlyInOurs[0].hash, "a2")
  })
})

describe("xor – cross-check", () => {
  test("both passes agree → empty warnings", () => {
    const ours = [
      new Commit({ hash: "a1", subject: "Fix login" }),
      new Commit({ hash: "a2", subject: "Add tests" })
    ]
    const theirs = [
      new Commit({ hash: "b1", subject: "Fix login" }),
      new Commit({ hash: "b2", subject: "Add tests" })
    ]
    const result = xor(ours, theirs)
    assert.strictEqual(result.warnings.length, 0)
  })
})

describe("xor – cherry-pick matching", () => {
  const HASH_A = "a".repeat(40)
  const HASH_B = "b".repeat(40)

  test("cherry-pick -x: theirs was cherry-picked from ours → matched", () => {
    const ours = [new Commit({ hash: HASH_A, subject: "Fix login" })]
    const theirs = [new Commit({ hash: HASH_B, subject: "Fix login", cherryPickOf: HASH_A })]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 1)
    assert.strictEqual(result.onlyInOurs.length, 0)
    assert.strictEqual(result.onlyInTheirs.length, 0)
  })

  test("cherry-pick -x: ours was cherry-picked from theirs → matched", () => {
    const ours = [new Commit({ hash: HASH_A, subject: "Fix login", cherryPickOf: HASH_B })]
    const theirs = [new Commit({ hash: HASH_B, subject: "Fix login" })]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 1)
    assert.strictEqual(result.onlyInOurs.length, 0)
    assert.strictEqual(result.onlyInTheirs.length, 0)
  })

  test("cherry-pick -x with amended subject → still matched via hash", () => {
    const ours = [new Commit({ hash: HASH_A, subject: "Fix login" })]
    const theirs = [
      new Commit({ hash: HASH_B, subject: "Fix login (backport)", cherryPickOf: HASH_A })
    ]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 1)
    assert.strictEqual(result.onlyInOurs.length, 0)
    assert.strictEqual(result.onlyInTheirs.length, 0)
  })

  test("cherry-pick -x pointing to unrelated commit → not matched", () => {
    const unrelated = "c".repeat(40)
    const ours = [new Commit({ hash: HASH_A, subject: "Fix login" })]
    const theirs = [new Commit({ hash: HASH_B, subject: "Add tests", cherryPickOf: unrelated })]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 0)
    assert.strictEqual(result.onlyInOurs.length, 1)
    assert.strictEqual(result.onlyInTheirs.length, 1)
  })
})

describe("xor – author-aware matching", () => {
  test("same subject + same author → matched", () => {
    const ours = [
      new Commit({
        hash: "a1",
        subject: "Fix typo",
        authorName: "Alice",
        authorEmail: "a@x.com",
        authorDate: "2025-01-15"
      })
    ]
    const theirs = [
      new Commit({
        hash: "b1",
        subject: "Fix typo",
        authorName: "Alice",
        authorEmail: "a@x.com",
        authorDate: "2025-01-15"
      })
    ]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 1)
    assert.strictEqual(result.onlyInOurs.length, 0)
    assert.strictEqual(result.onlyInTheirs.length, 0)
  })

  test("same subject + different author → not matched", () => {
    const ours = [
      new Commit({
        hash: "a1",
        subject: "Fix typo",
        authorName: "Alice",
        authorEmail: "a@x.com",
        authorDate: "2025-01-15"
      })
    ]
    const theirs = [
      new Commit({
        hash: "b1",
        subject: "Fix typo",
        authorName: "Bob",
        authorEmail: "b@x.com",
        authorDate: "2025-06-20"
      })
    ]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 0)
    assert.strictEqual(result.onlyInOurs.length, 1)
    assert.strictEqual(result.onlyInTheirs.length, 1)
  })

  test("same subject + same author but different date → not matched", () => {
    const ours = [
      new Commit({
        hash: "a1",
        subject: "Fix typo",
        authorName: "Alice",
        authorEmail: "a@x.com",
        authorDate: "2025-01-15"
      })
    ]
    const theirs = [
      new Commit({
        hash: "b1",
        subject: "Fix typo",
        authorName: "Alice",
        authorEmail: "a@x.com",
        authorDate: "2025-06-20"
      })
    ]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 0)
    assert.strictEqual(result.onlyInOurs.length, 1)
    assert.strictEqual(result.onlyInTheirs.length, 1)
  })
})

describe("xor – edge cases", () => {
  test("ours empty → everything in onlyInTheirs", () => {
    const theirs = [new Commit({ hash: "b1", subject: "Fix login" })]
    const result = xor([], theirs)
    assert.strictEqual(result.matched.length, 0)
    assert.strictEqual(result.onlyInOurs.length, 0)
    assert.strictEqual(result.onlyInTheirs.length, 1)
  })

  test("theirs empty → everything in onlyInOurs", () => {
    const ours = [new Commit({ hash: "a1", subject: "Fix login" })]
    const result = xor(ours, [])
    assert.strictEqual(result.matched.length, 0)
    assert.strictEqual(result.onlyInOurs.length, 1)
    assert.strictEqual(result.onlyInTheirs.length, 0)
  })

  test("both sides empty → all empty", () => {
    const result = xor([], [])
    assert.strictEqual(result.matched.length, 0)
    assert.strictEqual(result.onlyInOurs.length, 0)
    assert.strictEqual(result.onlyInTheirs.length, 0)
    assert.strictEqual(result.warnings.length, 0)
  })
})
