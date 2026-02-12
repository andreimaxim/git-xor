import { describe, test, expect } from "bun:test"
import { Commit } from "../src/commit.ts"

const PROJ = /PROJ-\d+/

describe("Commit.sameAs", () => {
  test("same subject, overlapping files → true", () => {
    const a = new Commit("aaa", "Fix login", ["src/auth.ts"])
    const b = new Commit("bbb", "Fix login", ["src/auth.ts"])
    expect(a.sameAs(b)).toBe(true)
  })

  test("same subject, no files in common → false", () => {
    const a = new Commit("aaa", "Fix login", ["src/auth.ts"])
    const b = new Commit("bbb", "Fix login", ["src/api.ts"])
    expect(a.sameAs(b)).toBe(false)
  })

  test("different subject → false", () => {
    const a = new Commit("aaa", "Fix login", ["src/auth.ts"])
    const b = new Commit("bbb", "Fix logout", ["src/auth.ts"])
    expect(a.sameAs(b)).toBe(false)
  })

  test("same subject, partial file overlap → true", () => {
    const a = new Commit("aaa", "Fix login", ["src/auth.ts", "src/utils.ts"])
    const b = new Commit("bbb", "Fix login", ["src/auth.ts", "src/api.ts"])
    expect(a.sameAs(b)).toBe(true)
  })

  test("identical hash → true", () => {
    const a = new Commit("aaa", "Fix login", ["src/auth.ts"])
    const b = new Commit("aaa", "Fix logout", ["src/api.ts"])
    expect(a.sameAs(b)).toBe(true)
  })
})

describe("Commit.ticketId", () => {
  const c = (subject: string) => new Commit("aaa", subject, [])

  test("brackets: [PROJ-1] Fix login → PROJ-1", () => {
    expect(c("[PROJ-1] Fix login").ticketId(PROJ)).toBe("PROJ-1")
  })

  test("no brackets: PROJ-12345 Fix login → PROJ-12345", () => {
    expect(c("PROJ-12345 Fix login").ticketId(PROJ)).toBe("PROJ-12345")
  })

  test("colon: PROJ-1234567890: Fix login → PROJ-1234567890", () => {
    expect(c("PROJ-1234567890: Fix login").ticketId(PROJ)).toBe("PROJ-1234567890")
  })

  test("parentheses: Fix login (PROJ-99) → PROJ-99", () => {
    expect(c("Fix login (PROJ-99)").ticketId(PROJ)).toBe("PROJ-99")
  })

  test("conventional commit: fix(PROJ-42): Fix login → PROJ-42", () => {
    expect(c("fix(PROJ-42): Fix login").ticketId(PROJ)).toBe("PROJ-42")
  })

  test("no ticket → undefined", () => {
    expect(c("Fix login").ticketId(PROJ)).toBeUndefined()
  })

  test("multiple tickets: [PROJ-1] relates to PROJ-2 → first one (PROJ-1)", () => {
    expect(c("[PROJ-1] relates to PROJ-2").ticketId(PROJ)).toBe("PROJ-1")
  })

  test("custom pattern: GH-123 Fix login with GH-\\d+ → GH-123", () => {
    expect(c("GH-123 Fix login").ticketId(/GH-\d+/)).toBe("GH-123")
  })

  test("GitHub-style # prefix: Fix login (#456) with #\\d+ → #456", () => {
    expect(c("Fix login (#456)").ticketId(/#\d+/)).toBe("#456")
  })
})
