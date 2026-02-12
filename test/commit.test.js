import { describe, test } from "node:test"
import assert from "node:assert/strict"
import { Commit } from "../src/commit.js"

const PROJ = /PROJ-\d+/

function stubFiles(mapping) {
  return (hash) => mapping[hash] ?? []
}

describe("Commit.sameAs", () => {
  test("same subject, overlapping files → true", () => {
    const a = new Commit("aaa", "Fix login", ["src/auth.ts"])
    const b = new Commit("bbb", "Fix login", ["src/auth.ts"])
    assert.strictEqual(a.sameAs(b), true)
  })

  test("same subject, no files in common → false", () => {
    const a = new Commit("aaa", "Fix login", ["src/auth.ts"])
    const b = new Commit("bbb", "Fix login", ["src/api.ts"])
    assert.strictEqual(a.sameAs(b), false)
  })

  test("different subject → false", () => {
    const a = new Commit("aaa", "Fix login", ["src/auth.ts"])
    const b = new Commit("bbb", "Fix logout", ["src/auth.ts"])
    assert.strictEqual(a.sameAs(b), false)
  })

  test("same subject, partial file overlap → true", () => {
    const a = new Commit("aaa", "Fix login", ["src/auth.ts", "src/utils.ts"])
    const b = new Commit("bbb", "Fix login", ["src/auth.ts", "src/api.ts"])
    assert.strictEqual(a.sameAs(b), true)
  })

  test("identical hash → true", () => {
    const a = new Commit("aaa", "Fix login", ["src/auth.ts"])
    const b = new Commit("aaa", "Fix logout", ["src/api.ts"])
    assert.strictEqual(a.sameAs(b), true)
  })
})

describe("Commit.fromLog", () => {
  const HASH_A = "a".repeat(40)
  const HASH_B = "b".repeat(40)
  const PARENT = "0".repeat(40)
  const PARENT2 = "1".repeat(40)

  test("parses single commit", () => {
    const log = `${HASH_A} ${PARENT} Fix login`
    const files = stubFiles({ [HASH_A]: ["src/auth.ts"] })
    const commits = Commit.fromLog(log, files)

    assert.strictEqual(commits.length, 1)
    assert.strictEqual(commits[0].hash, HASH_A)
    assert.strictEqual(commits[0].subject, "Fix login")
    assert.deepStrictEqual(commits[0].files, ["src/auth.ts"])
  })

  test("parses multiple commits", () => {
    const log = [`${HASH_A} ${PARENT} Fix login`, `${HASH_B} ${HASH_A} Add tests`].join("\n")
    const files = stubFiles({
      [HASH_A]: ["src/auth.ts"],
      [HASH_B]: ["test/auth.test.ts"]
    })
    const commits = Commit.fromLog(log, files)

    assert.strictEqual(commits.length, 2)
    assert.strictEqual(commits[0].subject, "Fix login")
    assert.strictEqual(commits[1].subject, "Add tests")
  })

  test("skips merge commits (multiple parents)", () => {
    const log = [
      `${HASH_A} ${PARENT} ${PARENT2} Merge branch 'main'`,
      `${HASH_B} ${PARENT} Real commit`
    ].join("\n")
    const files = stubFiles({ [HASH_B]: ["src/app.ts"] })
    const commits = Commit.fromLog(log, files)

    assert.strictEqual(commits.length, 1)
    assert.strictEqual(commits[0].hash, HASH_B)
  })

  test("returns empty array for empty output", () => {
    assert.deepStrictEqual(
      Commit.fromLog("", () => []),
      []
    )
  })

  test("returns empty array for undefined output", () => {
    assert.deepStrictEqual(
      Commit.fromLog(undefined, () => []),
      []
    )
  })

  test("skips blank lines", () => {
    const log = `\n${HASH_A} ${PARENT} Fix login\n\n`
    const files = stubFiles({ [HASH_A]: ["src/auth.ts"] })
    const commits = Commit.fromLog(log, files)

    assert.strictEqual(commits.length, 1)
  })
})

describe("Commit.ticketId", () => {
  const c = (subject) => new Commit("aaa", subject, [])

  test("brackets: [PROJ-1] Fix login → PROJ-1", () => {
    assert.strictEqual(c("[PROJ-1] Fix login").ticketId(PROJ), "PROJ-1")
  })

  test("no brackets: PROJ-12345 Fix login → PROJ-12345", () => {
    assert.strictEqual(c("PROJ-12345 Fix login").ticketId(PROJ), "PROJ-12345")
  })

  test("colon: PROJ-1234567890: Fix login → PROJ-1234567890", () => {
    assert.strictEqual(c("PROJ-1234567890: Fix login").ticketId(PROJ), "PROJ-1234567890")
  })

  test("parentheses: Fix login (PROJ-99) → PROJ-99", () => {
    assert.strictEqual(c("Fix login (PROJ-99)").ticketId(PROJ), "PROJ-99")
  })

  test("conventional commit: fix(PROJ-42): Fix login → PROJ-42", () => {
    assert.strictEqual(c("fix(PROJ-42): Fix login").ticketId(PROJ), "PROJ-42")
  })

  test("no ticket → undefined", () => {
    assert.strictEqual(c("Fix login").ticketId(PROJ), undefined)
  })

  test("multiple tickets: [PROJ-1] relates to PROJ-2 → first one (PROJ-1)", () => {
    assert.strictEqual(c("[PROJ-1] relates to PROJ-2").ticketId(PROJ), "PROJ-1")
  })

  test("custom pattern: GH-123 Fix login with GH-\\d+ → GH-123", () => {
    assert.strictEqual(c("GH-123 Fix login").ticketId(/GH-\d+/), "GH-123")
  })

  test("GitHub-style # prefix: Fix login (#456) with #\\d+ → #456", () => {
    assert.strictEqual(c("Fix login (#456)").ticketId(/#\d+/), "#456")
  })
})
