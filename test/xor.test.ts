import { describe, test, expect } from "bun:test"
import { Commit } from "../src/commit.ts"
import { xor } from "../src/xor.ts"

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
    expect(result.matched).toHaveLength(2)
    expect(result.onlyInOurs).toHaveLength(0)
    expect(result.onlyInTheirs).toHaveLength(0)
    expect(result.matched[0]![0].hash).toBe("a1")
    expect(result.matched[0]![1].hash).toBe("b1")
    expect(result.matched[1]![0].hash).toBe("a2")
    expect(result.matched[1]![1].hash).toBe("b2")
  })

  test("no commits match → all in onlyInOurs, all in onlyInTheirs", () => {
    const ours = [new Commit("a1", "Fix login", ["src/auth.ts"])]
    const theirs = [new Commit("b1", "Add tests", ["test/foo.test.ts"])]
    const result = xor(ours, theirs)
    expect(result.matched).toHaveLength(0)
    expect(result.onlyInOurs).toHaveLength(1)
    expect(result.onlyInTheirs).toHaveLength(1)
    expect(result.onlyInOurs[0]!.hash).toBe("a1")
    expect(result.onlyInTheirs[0]!.hash).toBe("b1")
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
    expect(result.matched).toHaveLength(1)
    expect(result.onlyInOurs).toHaveLength(1)
    expect(result.onlyInTheirs).toHaveLength(1)
    expect(result.onlyInOurs[0]!.hash).toBe("a2")
    expect(result.onlyInTheirs[0]!.hash).toBe("b2")
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
    expect(result.matched).toHaveLength(1)
    expect(result.matched[0]![0].hash).toBe("a1")
    expect(result.matched[0]![1].hash).toBe("b1")
    expect(result.onlyInOurs).toHaveLength(1)
    expect(result.onlyInOurs[0]!.hash).toBe("a2")
  })

  test("same subject on both sides but different files → no match", () => {
    const ours = [new Commit("a1", "Fix login", ["src/auth.ts"])]
    const theirs = [new Commit("b1", "Fix login", ["src/api.ts"])]
    const result = xor(ours, theirs)
    expect(result.matched).toHaveLength(0)
    expect(result.onlyInOurs).toHaveLength(1)
    expect(result.onlyInTheirs).toHaveLength(1)
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
    expect(result.warnings).toHaveLength(0)
  })

  test("complex multi-match scenario still agrees (cross-check safety net)", () => {
    // With symmetric sameAs, greedy first-match from both directions
    // produces the same pairings. This verifies the cross-check runs
    // without false positives even with ambiguous matches.
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
    expect(result.matched).toHaveLength(3)
    expect(result.warnings).toHaveLength(0)
  })
})

describe("xor – edge cases", () => {
  test("ours empty → everything in onlyInTheirs", () => {
    const theirs = [new Commit("b1", "Fix login", ["src/auth.ts"])]
    const result = xor([], theirs)
    expect(result.matched).toHaveLength(0)
    expect(result.onlyInOurs).toHaveLength(0)
    expect(result.onlyInTheirs).toHaveLength(1)
  })

  test("theirs empty → everything in onlyInOurs", () => {
    const ours = [new Commit("a1", "Fix login", ["src/auth.ts"])]
    const result = xor(ours, [])
    expect(result.matched).toHaveLength(0)
    expect(result.onlyInOurs).toHaveLength(1)
    expect(result.onlyInTheirs).toHaveLength(0)
  })

  test("both sides empty → all empty", () => {
    const result = xor([], [])
    expect(result.matched).toHaveLength(0)
    expect(result.onlyInOurs).toHaveLength(0)
    expect(result.onlyInTheirs).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })
})
