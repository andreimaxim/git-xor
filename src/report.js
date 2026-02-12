// ── Helpers ──────────────────────────────────────────────────────

function short(hash) {
  return hash.slice(0, 7)
}

// ── Ticket helpers ───────────────────────────────────────────────

function sortTickets(tickets) {
  return [...tickets].toSorted((a, b) => {
    const numA = parseInt(a.replace(/\D+/g, ""), 10)
    const numB = parseInt(b.replace(/\D+/g, ""), 10)
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB
    return a.localeCompare(b)
  })
}

function collectTickets(commits, pattern) {
  const tickets = new Set()
  const noTicket = []
  for (const c of commits) {
    const id = c.ticketId(pattern)
    if (id) tickets.add(id)
    else noTicket.push(c)
  }
  return { tickets, noTicket }
}

// ── Report formatting ────────────────────────────────────────────

export function formatReport(opts) {
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
  const lines = []

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
    const toUrl = (ticket) => ticketUrl.replace("{ticket}", ticket)

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
