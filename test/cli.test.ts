import { describe, test, expect } from "bun:test"
import { Commit } from "../src/commit.ts"
import type { XorResult } from "../src/xor.ts"
import { formatReport } from "../src/cli.ts"

describe("formatReport – summary section", () => {
  test("shows merge-base, commit counts, and matched count", () => {
    const result: XorResult = {
      matched: [
        [
          new Commit("a1", "Fix login", ["src/auth.ts"]),
          new Commit("b1", "Fix login", ["src/auth.ts"])
        ]
      ],
      onlyInOurs: [new Commit("a2", "Only ours", ["src/x.ts"])],
      onlyInTheirs: [],
      warnings: []
    }

    const report = formatReport({
      result,
      ours: "main",
      theirs: "develop",
      mergeBaseShort: "abc1234",
      mergeBaseSubject: "Initial commit",
      oursCount: 2,
      theirsCount: 1
    })

    expect(report).toContain("── Summary ──")
    expect(report).toContain("abc1234 Initial commit")
    expect(report).toContain("main: 2 commit(s)")
    expect(report).toContain("develop: 1 commit(s)")
    expect(report).toContain("Matched: 1")
  })

  test("zero commits on both sides", () => {
    const result: XorResult = {
      matched: [],
      onlyInOurs: [],
      onlyInTheirs: [],
      warnings: []
    }

    const report = formatReport({
      result,
      ours: "main",
      theirs: "develop",
      mergeBaseShort: "abc1234",
      mergeBaseSubject: "Initial commit",
      oursCount: 0,
      theirsCount: 0
    })

    expect(report).toContain("main: 0 commit(s)")
    expect(report).toContain("develop: 0 commit(s)")
    expect(report).toContain("No unmatched commits.")
  })
})

describe("formatReport – commits section", () => {
  test("lists unmatched commits grouped by branch", () => {
    const result: XorResult = {
      matched: [],
      onlyInOurs: [new Commit("aaa1111", "Our change", ["src/a.ts"])],
      onlyInTheirs: [new Commit("bbb2222", "Their change", ["src/b.ts"])],
      warnings: []
    }

    const report = formatReport({
      result,
      ours: "main",
      theirs: "develop",
      mergeBaseShort: "abc1234",
      mergeBaseSubject: "Init",
      oursCount: 1,
      theirsCount: 1
    })

    expect(report).toContain("── Commits: main (1) vs develop (1) ──")
    expect(report).toContain("main:")
    expect(report).toContain("aaa1111 Our change")
    expect(report).toContain("develop:")
    expect(report).toContain("bbb2222 Their change")
  })

  test("does not list matched commits individually", () => {
    const result: XorResult = {
      matched: [
        [
          new Commit("a1", "Fix login", ["src/auth.ts"]),
          new Commit("b1", "Fix login", ["src/auth.ts"])
        ]
      ],
      onlyInOurs: [],
      onlyInTheirs: [],
      warnings: []
    }

    const report = formatReport({
      result,
      ours: "main",
      theirs: "develop",
      mergeBaseShort: "abc1234",
      mergeBaseSubject: "Init",
      oursCount: 1,
      theirsCount: 1
    })

    expect(report).not.toContain("Fix login")
    expect(report).toContain("No unmatched commits.")
  })
})

describe("formatReport – tickets section", () => {
  const pattern = /PROJ-\d+/
  const url = "https://jira.example.com/browse/{ticket}"

  test("not shown when ticket config is missing", () => {
    const result: XorResult = {
      matched: [],
      onlyInOurs: [new Commit("a1", "[PROJ-100] Fix", ["src/a.ts"])],
      onlyInTheirs: [],
      warnings: []
    }

    const report = formatReport({
      result,
      ours: "main",
      theirs: "develop",
      mergeBaseShort: "abc1234",
      mergeBaseSubject: "Init",
      oursCount: 1,
      theirsCount: 0
    })

    expect(report).not.toContain("── Tickets:")
  })

  test("tickets are deduplicated and sorted by numeric part", () => {
    const result: XorResult = {
      matched: [],
      onlyInOurs: [
        new Commit("a1", "[PROJ-200] Fix login", ["src/auth.ts"]),
        new Commit("a2", "[PROJ-100] Add tests", ["test/auth.test.ts"]),
        new Commit("a3", "[PROJ-200] Fix login again", ["src/auth.ts"])
      ],
      onlyInTheirs: [],
      warnings: []
    }

    const report = formatReport({
      result,
      ours: "main",
      theirs: "develop",
      mergeBaseShort: "abc1234",
      mergeBaseSubject: "Init",
      oursCount: 3,
      theirsCount: 0,
      ticketPattern: pattern,
      ticketUrl: url
    })

    expect(report).toContain("── Tickets: main (2) vs develop (0) ──")

    const lines = report.split("\n")
    const proj100Idx = lines.findIndex((l) => l.includes("browse/PROJ-100"))
    const proj200Idx = lines.findIndex((l) => l.includes("browse/PROJ-200"))
    expect(proj100Idx).toBeLessThan(proj200Idx)
    expect(lines[proj100Idx]).toContain("https://jira.example.com/browse/PROJ-100")
    expect(lines[proj200Idx]).toContain("https://jira.example.com/browse/PROJ-200")
  })

  test("commits without ticket ID listed separately", () => {
    const result: XorResult = {
      matched: [],
      onlyInOurs: [
        new Commit("aaa1111", "[PROJ-300] Has ticket", ["src/a.ts"]),
        new Commit("bbb2222", "No ticket here", ["src/b.ts"])
      ],
      onlyInTheirs: [],
      warnings: []
    }

    const report = formatReport({
      result,
      ours: "main",
      theirs: "develop",
      mergeBaseShort: "abc1234",
      mergeBaseSubject: "Init",
      oursCount: 2,
      theirsCount: 0,
      ticketPattern: pattern,
      ticketUrl: url
    })

    expect(report).toContain("Without ticket ID: 1 commit(s)")
    expect(report).toContain("bbb2222 No ticket here")
    expect(report).toContain("https://jira.example.com/browse/PROJ-300")
  })
})
