import { describe, test } from "node:test"
import assert from "node:assert/strict"
import { Commit } from "../src/commit.js"
import { xor } from "../src/xor.js"

describe("xor – basic cases", () => {
  test("all commits match → empty onlyInOurs, empty onlyInTheirs", () => {
    const ours = [new Commit("a1", "Fix login"), new Commit("a2", "Add tests")]
    const theirs = [new Commit("b1", "Fix login"), new Commit("b2", "Add tests")]
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
    const ours = [new Commit("a1", "Fix login")]
    const theirs = [new Commit("b1", "Add tests")]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 0)
    assert.strictEqual(result.onlyInOurs.length, 1)
    assert.strictEqual(result.onlyInTheirs.length, 1)
    assert.strictEqual(result.onlyInOurs[0].hash, "a1")
    assert.strictEqual(result.onlyInTheirs[0].hash, "b1")
  })

  test("mixed: some match, some don't on each side", () => {
    const ours = [new Commit("a1", "Fix login"), new Commit("a2", "Only ours")]
    const theirs = [new Commit("b1", "Fix login"), new Commit("b2", "Only theirs")]
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
    const ours = [new Commit("a1", "Fix login"), new Commit("a2", "Fix login")]
    const theirs = [new Commit("b1", "Fix login")]
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
    const ours = [new Commit("a1", "Fix login"), new Commit("a2", "Add tests")]
    const theirs = [new Commit("b1", "Fix login"), new Commit("b2", "Add tests")]
    const result = xor(ours, theirs)
    assert.strictEqual(result.warnings.length, 0)
  })
})

describe("xor – cherry-pick matching", () => {
  const HASH_A = "a".repeat(40)
  const HASH_B = "b".repeat(40)

  test("cherry-pick -x: theirs was cherry-picked from ours → matched", () => {
    const ours = [new Commit(HASH_A, "Fix login")]
    const theirs = [new Commit(HASH_B, "Fix login", HASH_A)]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 1)
    assert.strictEqual(result.onlyInOurs.length, 0)
    assert.strictEqual(result.onlyInTheirs.length, 0)
  })

  test("cherry-pick -x: ours was cherry-picked from theirs → matched", () => {
    const ours = [new Commit(HASH_A, "Fix login", HASH_B)]
    const theirs = [new Commit(HASH_B, "Fix login")]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 1)
    assert.strictEqual(result.onlyInOurs.length, 0)
    assert.strictEqual(result.onlyInTheirs.length, 0)
  })

  test("cherry-pick -x with amended subject → still matched via hash", () => {
    const ours = [new Commit(HASH_A, "Fix login")]
    const theirs = [new Commit(HASH_B, "Fix login (backport)", HASH_A)]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 1)
    assert.strictEqual(result.onlyInOurs.length, 0)
    assert.strictEqual(result.onlyInTheirs.length, 0)
  })

  test("cherry-pick -x pointing to unrelated commit → not matched", () => {
    const unrelated = "c".repeat(40)
    const ours = [new Commit(HASH_A, "Fix login")]
    const theirs = [new Commit(HASH_B, "Add tests", unrelated)]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 0)
    assert.strictEqual(result.onlyInOurs.length, 1)
    assert.strictEqual(result.onlyInTheirs.length, 1)
  })
})

describe("xor – edge cases", () => {
  test("ours empty → everything in onlyInTheirs", () => {
    const theirs = [new Commit("b1", "Fix login")]
    const result = xor([], theirs)
    assert.strictEqual(result.matched.length, 0)
    assert.strictEqual(result.onlyInOurs.length, 0)
    assert.strictEqual(result.onlyInTheirs.length, 1)
  })

  test("theirs empty → everything in onlyInOurs", () => {
    const ours = [new Commit("a1", "Fix login")]
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
