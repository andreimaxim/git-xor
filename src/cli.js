#!/usr/bin/env node

import { readGitconfig, getMergeBase, getLog, getCommitFiles, getCommitSubject } from "./git.js"
import { Commit } from "./commit.js"
import { xor } from "./xor.js"
import { formatReport } from "./report.js"

// ── Arg parsing ──────────────────────────────────────────────────

function parseArgs(argv) {
  const positional = []
  let ticketPattern
  let ticketUrl

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--ticket-pattern") {
      ticketPattern = argv[++i]
    } else if (argv[i] === "--ticket-url") {
      ticketUrl = argv[++i]
    } else if (!argv[i].startsWith("--")) {
      positional.push(argv[i])
    }
  }

  if (positional.length < 2) {
    console.error(
      "Usage: git xor <ours> <theirs> [--ticket-pattern <pattern>] [--ticket-url <url>]"
    )
    process.exit(1)
  }

  return {
    ours: positional[0],
    theirs: positional[1],
    ticketPattern,
    ticketUrl
  }
}

// ── Main ─────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2))

// Merge gitconfig with CLI flags (CLI wins)
const gitconfig = readGitconfig()
const ticketPatternStr = args.ticketPattern ?? gitconfig.ticketPattern
const ticketUrl = args.ticketUrl ?? gitconfig.ticketUrl

const mergeBase = getMergeBase(args.ours, args.theirs)
const mergeBaseShort = mergeBase.slice(0, 7)
const mergeBaseSubject = getCommitSubject(mergeBase)

const oursCommits = Commit.fromLog(getLog(mergeBase, args.ours), getCommitFiles)
const theirsCommits = Commit.fromLog(getLog(mergeBase, args.theirs), getCommitFiles)

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
