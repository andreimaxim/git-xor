#!/usr/bin/env bun

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { homedir } from "node:os"
import { Commit } from "./commit.ts"
import { xor } from "./xor.ts"
import type { XorResult } from "./xor.ts"

// ── Helpers ──────────────────────────────────────────────────────

function short(hash: string): string {
  return hash.slice(0, 7)
}

// ── Ticket helpers ───────────────────────────────────────────────

function sortTickets(tickets: Set<string>): string[] {
  return [...tickets].toSorted((a, b) => {
    const numA = parseInt(a.replace(/\D+/g, ""), 10)
    const numB = parseInt(b.replace(/\D+/g, ""), 10)
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB
    return a.localeCompare(b)
  })
}

function collectTickets(
  commits: Commit[],
  pattern: RegExp
): { tickets: Set<string>; noTicket: Commit[] } {
  const tickets = new Set<string>()
  const noTicket: Commit[] = []
  for (const c of commits) {
    const id = c.ticketId(pattern)
    if (id) tickets.add(id)
    else noTicket.push(c)
  }
  return { tickets, noTicket }
}

// ── Report formatting ────────────────────────────────────────────

export interface ReportOptions {
  result: XorResult
  ours: string
  theirs: string
  mergeBaseShort: string
  mergeBaseSubject: string
  oursCount: number
  theirsCount: number
  ticketPattern?: RegExp
  ticketUrl?: string
}

export function formatReport(opts: ReportOptions): string {
  const {
    result,
    ours,
    theirs,
    mergeBaseShort,
    mergeBaseSubject,
    oursCount,
    theirsCount,
    ticketPattern,
    ticketUrl
  } = opts
  const lines: string[] = []

  // ── Section 1: Summary ──

  lines.push("── Summary ──")
  lines.push("")
  lines.push(`  Merge-base: ${mergeBaseShort} ${mergeBaseSubject}`)
  lines.push(`  ${ours}: ${oursCount} commit(s)`)
  lines.push(`  ${theirs}: ${theirsCount} commit(s)`)
  lines.push(`  Matched: ${result.matched.length}`)
  lines.push("")

  // Cross-check
  if (result.warnings.length > 0) {
    lines.push(`  ⚠️  Cross-check WARNING: ${result.warnings.length} mismatch(es)`)
    for (const w of result.warnings) {
      lines.push(`    ${w}`)
    }
    lines.push("")
  }

  // ── Section 2: Commits ──

  lines.push(
    `── Commits: ${ours} (${result.onlyInOurs.length}) vs ${theirs} (${result.onlyInTheirs.length}) ──`
  )
  lines.push("")

  if (result.onlyInOurs.length > 0) {
    lines.push(`  ${ours}:`)
    for (const c of result.onlyInOurs) {
      lines.push(`    ${short(c.hash)} ${c.subject}`)
    }
    lines.push("")
  }

  if (result.onlyInTheirs.length > 0) {
    lines.push(`  ${theirs}:`)
    for (const c of result.onlyInTheirs) {
      lines.push(`    ${short(c.hash)} ${c.subject}`)
    }
    lines.push("")
  }

  if (result.onlyInOurs.length === 0 && result.onlyInTheirs.length === 0) {
    lines.push("  No unmatched commits.")
    lines.push("")
  }

  // ── Section 3: Tickets (only if configured) ──

  if (ticketPattern && ticketUrl) {
    const toUrl = (ticket: string) => ticketUrl.replace("{ticket}", ticket)

    const oursInfo = collectTickets(result.onlyInOurs, ticketPattern)
    const theirsInfo = collectTickets(result.onlyInTheirs, ticketPattern)
    const oursSorted = sortTickets(oursInfo.tickets)
    const theirsSorted = sortTickets(theirsInfo.tickets)
    const allNoTicket = [...oursInfo.noTicket, ...theirsInfo.noTicket]

    lines.push(
      `── Tickets: ${ours} (${oursSorted.length}) vs ${theirs} (${theirsSorted.length}) ──`
    )
    lines.push("")

    if (oursSorted.length > 0) {
      lines.push(`  ${ours}:`)
      for (const t of oursSorted) {
        lines.push(`    ${toUrl(t)}`)
      }
      lines.push("")
    }

    if (theirsSorted.length > 0) {
      lines.push(`  ${theirs}:`)
      for (const t of theirsSorted) {
        lines.push(`    ${toUrl(t)}`)
      }
      lines.push("")
    }

    if (allNoTicket.length > 0) {
      lines.push(`  Without ticket ID: ${allNoTicket.length} commit(s)`)
      for (const c of allNoTicket) {
        lines.push(`    ${short(c.hash)} ${c.subject}`)
      }
      lines.push("")
    }
  }

  return lines.join("\n").trimEnd()
}

// ── Gitconfig parsing ────────────────────────────────────────────

interface XorConfig {
  ticketPattern?: string
  ticketUrl?: string
}

function parseGitconfig(content: string): XorConfig {
  const config: XorConfig = {}
  let inXorSection = false

  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (trimmed.startsWith("[")) {
      inXorSection = trimmed.toLowerCase() === "[xor]"
      continue
    }
    if (!inXorSection) continue

    const match = trimmed.match(/^([\w-]+)\s*=\s*(.+)$/)
    if (!match) continue

    const [, key, value] = match
    const cleaned = value!.trim()
    if (key === "ticket-pattern") config.ticketPattern = cleaned
    else if (key === "ticket-url") config.ticketUrl = cleaned
  }

  return config
}

function readGitconfig(): XorConfig {
  const paths = [resolve(".git/config"), resolve(homedir(), ".gitconfig")]

  for (const p of paths) {
    if (existsSync(p)) {
      const content = readFileSync(p, "utf-8")
      const config = parseGitconfig(content)
      if (config.ticketPattern || config.ticketUrl) return config
    }
  }

  return {}
}

// ── Arg parsing ──────────────────────────────────────────────────

interface Args {
  ours: string
  theirs: string
  ticketPattern?: string
  ticketUrl?: string
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = []
  let ticketPattern: string | undefined
  let ticketUrl: string | undefined

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--ticket-pattern") {
      ticketPattern = argv[++i]
    } else if (argv[i] === "--ticket-url") {
      ticketUrl = argv[++i]
    } else if (!argv[i]!.startsWith("--")) {
      positional.push(argv[i]!)
    }
  }

  if (positional.length < 2) {
    console.error(
      "Usage: git xor <ours> <theirs> [--ticket-pattern <pattern>] [--ticket-url <url>]"
    )
    process.exit(1)
  }

  return {
    ours: positional[0]!,
    theirs: positional[1]!,
    ticketPattern,
    ticketUrl
  }
}

// ── Git operations ───────────────────────────────────────────────

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf-8" }).trim()
}

function getMergeBase(ours: string, theirs: string): string {
  try {
    return git("merge-base", ours, theirs)
  } catch {
    console.error(`Error: cannot find merge-base for ${ours} and ${theirs}`)
    process.exit(1)
  }
}

function getCommits(base: string, branch: string): Commit[] {
  let logOutput: string
  try {
    logOutput = git("log", "--reverse", "--format=%H %P %s", `${base}..${branch}`)
  } catch {
    console.error(`Error: branch '${branch}' does not exist`)
    process.exit(1)
  }

  if (!logOutput) return []

  const commits: Commit[] = []
  for (const line of logOutput.split("\n")) {
    if (!line.trim()) continue

    // Parse: <hash> <parent(s)> <subject>
    // Parents are space-separated, so merge commits have 2+ parent hashes
    const firstSpace = line.indexOf(" ")
    const hash = line.slice(0, firstSpace)
    const rest = line.slice(firstSpace + 1)

    // Find where subject starts: after all parent hashes (40-char hex each)
    const parts = rest.split(" ")
    const parents: string[] = []
    let subjectStartIdx = 0
    for (const part of parts) {
      if (/^[0-9a-f]{40}$/.test(part)) {
        parents.push(part)
        subjectStartIdx += part.length + 1
      } else {
        break
      }
    }

    // Skip merge commits (multiple parents)
    if (parents.length > 1) continue

    const subject = rest.slice(subjectStartIdx)
    const files = git("diff-tree", "--no-commit-id", "--name-only", "-r", hash!)
      .split("\n")
      .filter(Boolean)

    commits.push(new Commit(hash!, subject, files))
  }

  return commits
}

function getCommitSubject(hash: string): string {
  return git("log", "-1", "--format=%s", hash)
}

// ── Main ─────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv.slice(2))

  // Merge gitconfig with CLI flags (CLI wins)
  const gitconfig = readGitconfig()
  const ticketPatternStr = args.ticketPattern ?? gitconfig.ticketPattern
  const ticketUrl = args.ticketUrl ?? gitconfig.ticketUrl

  const mergeBase = getMergeBase(args.ours, args.theirs)
  const mergeBaseShort = mergeBase.slice(0, 7)
  const mergeBaseSubject = getCommitSubject(mergeBase)

  const oursCommits = getCommits(mergeBase, args.ours)
  const theirsCommits = getCommits(mergeBase, args.theirs)

  const result = xor(oursCommits, theirsCommits)

  console.log(
    formatReport({
      result,
      ours: args.ours,
      theirs: args.theirs,
      mergeBaseShort,
      mergeBaseSubject,
      oursCount: oursCommits.length,
      theirsCount: theirsCommits.length,
      ticketPattern: ticketPatternStr ? new RegExp(ticketPatternStr) : undefined,
      ticketUrl
    })
  )
}

if (import.meta.main) main()
