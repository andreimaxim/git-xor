import { describe, test } from "node:test"
import assert from "node:assert/strict"
import { Commit } from "../src/commit.js"

const PROJ = /PROJ-\d+/

const HASH_A = "a".repeat(40)
const HASH_B = "b".repeat(40)
const PARENT = "0".repeat(40)
const PARENT2 = "1".repeat(40)

const AUTHOR_NAME = "Alice"
const AUTHOR_EMAIL = "alice@example.com"
const AUTHOR_DATE = "2025-01-15T10:30:00+00:00"
function record(hash, parents, subject, body = "") {
  return `${hash}\x00${parents}\x00${subject}\x00${AUTHOR_NAME}\x00${AUTHOR_EMAIL}\x00${AUTHOR_DATE}\x00${body}\x1e`
}

describe("Commit.sameAs", () => {
  test("same subject + same author → true", () => {
    const a = new Commit("aaa", "Fix login", undefined, "Alice", "alice@x.com", "2025-01-15")
    const b = new Commit("bbb", "Fix login", undefined, "Alice", "alice@x.com", "2025-01-15")
    assert.strictEqual(a.sameAs(b), true)
  })

  test("same subject + different author name → false", () => {
    const a = new Commit("aaa", "Fix login", undefined, "Alice", "alice@x.com", "2025-01-15")
    const b = new Commit("bbb", "Fix login", undefined, "Bob", "alice@x.com", "2025-01-15")
    assert.strictEqual(a.sameAs(b), false)
  })

  test("same subject + different author email → false", () => {
    const a = new Commit("aaa", "Fix login", undefined, "Alice", "alice@x.com", "2025-01-15")
    const b = new Commit("bbb", "Fix login", undefined, "Alice", "bob@x.com", "2025-01-15")
    assert.strictEqual(a.sameAs(b), false)
  })

  test("same subject + different author date → false", () => {
    const a = new Commit("aaa", "Fix login", undefined, "Alice", "alice@x.com", "2025-01-15")
    const b = new Commit("bbb", "Fix login", undefined, "Alice", "alice@x.com", "2025-06-20")
    assert.strictEqual(a.sameAs(b), false)
  })

  test("different subject → false", () => {
    const a = new Commit("aaa", "Fix login")
    const b = new Commit("bbb", "Fix logout")
    assert.strictEqual(a.sameAs(b), false)
  })

  test("identical hash → true regardless of other fields", () => {
    const a = new Commit("aaa", "Fix login", undefined, "Alice", "a@x.com", "2025-01-15")
    const b = new Commit("aaa", "Fix logout", undefined, "Bob", "b@x.com", "2025-06-20")
    assert.strictEqual(a.sameAs(b), true)
  })

  test("this was cherry-picked from other → true", () => {
    const original = new Commit(HASH_A, "Fix login")
    const picked = new Commit(HASH_B, "Fix login", HASH_A)
    assert.strictEqual(picked.sameAs(original), true)
  })

  test("other was cherry-picked from this → true", () => {
    const original = new Commit(HASH_A, "Fix login")
    const picked = new Commit(HASH_B, "Fix login", HASH_A)
    assert.strictEqual(original.sameAs(picked), true)
  })

  test("cherry-pick match overrides different subject", () => {
    const original = new Commit(HASH_A, "Fix login")
    const picked = new Commit(HASH_B, "Fix login (amended)", HASH_A)
    assert.strictEqual(picked.sameAs(original), true)
  })

  test("unrelated cherry-pick hash does not match", () => {
    const a = new Commit(HASH_A, "Fix login", PARENT)
    const b = new Commit(HASH_B, "Fix logout", PARENT2)
    assert.strictEqual(a.sameAs(b), false)
  })
})

describe("Commit.fromLog", () => {
  test("parses single commit with author fields", () => {
    const log = record(HASH_A, PARENT, "Fix login")
    const commits = Commit.fromLog(log)

    assert.strictEqual(commits.length, 1)
    assert.strictEqual(commits[0].hash, HASH_A)
    assert.strictEqual(commits[0].subject, "Fix login")
    assert.strictEqual(commits[0].cherryPickOf, undefined)
    assert.strictEqual(commits[0].authorName, AUTHOR_NAME)
    assert.strictEqual(commits[0].authorEmail, AUTHOR_EMAIL)
    assert.strictEqual(commits[0].authorDate, AUTHOR_DATE)
  })

  test("parses multiple commits", () => {
    const log = record(HASH_A, PARENT, "Fix login") + record(HASH_B, HASH_A, "Add tests")
    const commits = Commit.fromLog(log)

    assert.strictEqual(commits.length, 2)
    assert.strictEqual(commits[0].subject, "Fix login")
    assert.strictEqual(commits[1].subject, "Add tests")
  })

  test("skips merge commits (multiple parents)", () => {
    const log =
      record(HASH_A, `${PARENT} ${PARENT2}`, "Merge branch 'main'") +
      record(HASH_B, PARENT, "Real commit")
    const commits = Commit.fromLog(log)

    assert.strictEqual(commits.length, 1)
    assert.strictEqual(commits[0].hash, HASH_B)
  })

  test("returns empty array for empty output", () => {
    assert.deepStrictEqual(Commit.fromLog(""), [])
  })

  test("returns empty array for undefined output", () => {
    assert.deepStrictEqual(Commit.fromLog(undefined), [])
  })

  test("skips blank records", () => {
    const log = `\x1e${record(HASH_A, PARENT, "Fix login")}\x1e`
    const commits = Commit.fromLog(log)

    assert.strictEqual(commits.length, 1)
  })

  test("extracts cherry-pick origin from body", () => {
    const body = `Some context\n\n(cherry picked from commit ${HASH_B})\n`
    const log = record(HASH_A, PARENT, "Fix login", body)
    const commits = Commit.fromLog(log)

    assert.strictEqual(commits.length, 1)
    assert.strictEqual(commits[0].hash, HASH_A)
    assert.strictEqual(commits[0].cherryPickOf, HASH_B)
  })

  test("no cherry-pick marker → cherryPickOf is undefined", () => {
    const body = "Just a regular body\n"
    const log = record(HASH_A, PARENT, "Fix login", body)
    const commits = Commit.fromLog(log)

    assert.strictEqual(commits.length, 1)
    assert.strictEqual(commits[0].cherryPickOf, undefined)
  })
})

describe("Commit.ticketId", () => {
  const c = (subject) => new Commit("aaa", subject)

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
