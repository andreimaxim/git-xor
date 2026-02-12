import { describe, test } from "node:test"
import assert from "node:assert/strict"
import { Commit } from "../src/commit.js"
import { xor } from "../src/xor.js"

describe("xor – basic cases", () => {
  test("all commits match → empty onlyInOurs, empty onlyInTheirs", () => {
    const ours = [
      new Commit("a1", "Fix login", ["src/auth.ts"]),
      new Commit("a2", "Add tests", ["test/auth.test.ts"])
    ]
    const theirs = [
      new Commit("b1", "Fix login", ["src/auth.ts"]),
      new Commit("b2", "Add tests", ["test/auth.test.ts"])
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
    const ours = [new Commit("a1", "Fix login", ["src/auth.ts"])]
    const theirs = [new Commit("b1", "Add tests", ["test/foo.test.ts"])]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 0)
    assert.strictEqual(result.onlyInOurs.length, 1)
    assert.strictEqual(result.onlyInTheirs.length, 1)
    assert.strictEqual(result.onlyInOurs[0].hash, "a1")
    assert.strictEqual(result.onlyInTheirs[0].hash, "b1")
  })

  test("mixed: some match, some don't on each side", () => {
    const ours = [
      new Commit("a1", "Fix login", ["src/auth.ts"]),
      new Commit("a2", "Only ours", ["src/ours.ts"])
    ]
    const theirs = [
      new Commit("b1", "Fix login", ["src/auth.ts"]),
      new Commit("b2", "Only theirs", ["src/theirs.ts"])
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
  test("two commits with same subject+files on ours, one on theirs → first matches, second is onlyInOurs", () => {
    const ours = [
      new Commit("a1", "Fix login", ["src/auth.ts"]),
      new Commit("a2", "Fix login", ["src/auth.ts"])
    ]
    const theirs = [new Commit("b1", "Fix login", ["src/auth.ts"])]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 1)
    assert.strictEqual(result.matched[0][0].hash, "a1")
    assert.strictEqual(result.matched[0][1].hash, "b1")
    assert.strictEqual(result.onlyInOurs.length, 1)
    assert.strictEqual(result.onlyInOurs[0].hash, "a2")
  })

  test("same subject on both sides but different files → no match", () => {
    const ours = [new Commit("a1", "Fix login", ["src/auth.ts"])]
    const theirs = [new Commit("b1", "Fix login", ["src/api.ts"])]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 0)
    assert.strictEqual(result.onlyInOurs.length, 1)
    assert.strictEqual(result.onlyInTheirs.length, 1)
  })
})

describe("xor – cross-check", () => {
  test("both passes agree → empty warnings", () => {
    const ours = [
      new Commit("a1", "Fix login", ["src/auth.ts"]),
      new Commit("a2", "Add tests", ["test/auth.test.ts"])
    ]
    const theirs = [
      new Commit("b1", "Fix login", ["src/auth.ts"]),
      new Commit("b2", "Add tests", ["test/auth.test.ts"])
    ]
    const result = xor(ours, theirs)
    assert.strictEqual(result.warnings.length, 0)
  })

  test("complex multi-match scenario still agrees (cross-check safety net)", () => {
    const ours = [
      new Commit("a1", "Do stuff", ["x", "y"]),
      new Commit("a2", "Do stuff", ["y", "z"]),
      new Commit("a3", "Do stuff", ["z", "x"])
    ]
    const theirs = [
      new Commit("b1", "Do stuff", ["y", "z"]),
      new Commit("b2", "Do stuff", ["z", "x"]),
      new Commit("b3", "Do stuff", ["x", "y"])
    ]
    const result = xor(ours, theirs)
    assert.strictEqual(result.matched.length, 3)
    assert.strictEqual(result.warnings.length, 0)
  })
})

describe("xor – edge cases", () => {
  test("ours empty → everything in onlyInTheirs", () => {
    const theirs = [new Commit("b1", "Fix login", ["src/auth.ts"])]
    const result = xor([], theirs)
    assert.strictEqual(result.matched.length, 0)
    assert.strictEqual(result.onlyInOurs.length, 0)
    assert.strictEqual(result.onlyInTheirs.length, 1)
  })

  test("theirs empty → everything in onlyInOurs", () => {
    const ours = [new Commit("a1", "Fix login", ["src/auth.ts"])]
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
