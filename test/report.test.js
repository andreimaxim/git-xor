import { describe, test } from "node:test"
import assert from "node:assert/strict"
import { Commit } from "../src/commit.js"
import { formatReport } from "../src/report.js"

describe("formatReport – summary section", () => {
  test("shows merge-base, commit counts, and matched count", () => {
    const result = {
      matched: [[new Commit("a1", "Fix login"), new Commit("b1", "Fix login")]],
      onlyInOurs: [new Commit("a2", "Only ours")],
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

    assert.ok(report.includes("── Summary ──"))
    assert.ok(report.includes("abc1234 Initial commit"))
    assert.ok(report.includes("main: 2 commit(s)"))
    assert.ok(report.includes("develop: 1 commit(s)"))
    assert.ok(report.includes("Matched: 1"))
  })

  test("zero commits on both sides", () => {
    const result = {
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

    assert.ok(report.includes("main: 0 commit(s)"))
    assert.ok(report.includes("develop: 0 commit(s)"))
    assert.ok(report.includes("No unmatched commits."))
  })
})

describe("formatReport – commits section", () => {
  test("lists unmatched commits grouped by branch", () => {
    const result = {
      matched: [],
      onlyInOurs: [new Commit("aaa1111", "Our change")],
      onlyInTheirs: [new Commit("bbb2222", "Their change")],
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

    assert.ok(report.includes("── Commits: main (1) vs develop (1) ──"))
    assert.ok(report.includes("main:"))
    assert.ok(report.includes("aaa1111 Our change"))
    assert.ok(report.includes("develop:"))
    assert.ok(report.includes("bbb2222 Their change"))
  })

  test("does not list matched commits individually", () => {
    const result = {
      matched: [[new Commit("a1", "Fix login"), new Commit("b1", "Fix login")]],
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

    assert.ok(!report.includes("Fix login"))
    assert.ok(report.includes("No unmatched commits."))
  })
})

describe("formatReport – tickets section", () => {
  const pattern = /PROJ-\d+/
  const url = "https://jira.example.com/browse/{ticket}"

  test("not shown when ticket config is missing", () => {
    const result = {
      matched: [],
      onlyInOurs: [new Commit("a1", "[PROJ-100] Fix")],
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

    assert.ok(!report.includes("── Tickets:"))
  })

  test("tickets are deduplicated and sorted by numeric part", () => {
    const result = {
      matched: [],
      onlyInOurs: [
        new Commit("a1", "[PROJ-200] Fix login"),
        new Commit("a2", "[PROJ-100] Add tests"),
        new Commit("a3", "[PROJ-200] Fix login again")
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

    assert.ok(report.includes("── Tickets: main (2) vs develop (0) ──"))

    const lines = report.split("\n")
    const proj100Idx = lines.findIndex((l) => l.includes("browse/PROJ-100"))
    const proj200Idx = lines.findIndex((l) => l.includes("browse/PROJ-200"))
    assert.ok(proj100Idx < proj200Idx)
    assert.ok(lines[proj100Idx].includes("https://jira.example.com/browse/PROJ-100"))
    assert.ok(lines[proj200Idx].includes("https://jira.example.com/browse/PROJ-200"))
  })

  test("commits without ticket ID listed separately", () => {
    const result = {
      matched: [],
      onlyInOurs: [
        new Commit("aaa1111", "[PROJ-300] Has ticket"),
        new Commit("bbb2222", "No ticket here")
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

    assert.ok(report.includes("Without ticket ID: 1 commit(s)"))
    assert.ok(report.includes("bbb2222 No ticket here"))
    assert.ok(report.includes("https://jira.example.com/browse/PROJ-300"))
  })
})
