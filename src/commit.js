const CHERRY_PICK_RE = /\(cherry picked from commit ([0-9a-f]{40})\)/

export class Commit {
  constructor(hash, subject, cherryPickOf) {
    this.hash = hash
    this.subject = subject
    this.cherryPickOf = cherryPickOf
  }

  static fromLog(logOutput) {
    if (!logOutput) return []

    const commits = []
    for (const record of logOutput.split("\x1e")) {
      if (!record.trim()) continue

      const fields = record.split("\x00")
      if (fields.length < 3) continue

      const hash = fields[0].trim()
      const parentStr = fields[1].trim()
      const parents = parentStr ? parentStr.split(/\s+/) : []
      const subject = fields[2]
      const body = fields[3] || ""

      // Skip merge commits (multiple parents)
      if (parents.length > 1) continue

      // Extract cherry-pick origin from body
      const cpMatch = body.match(CHERRY_PICK_RE)
      const cherryPickOf = cpMatch ? cpMatch[1] : undefined

      commits.push(new Commit(hash, subject, cherryPickOf))
    }

    return commits
  }

  sameAs(other) {
    if (this.hash === other.hash) return true
    if (this.cherryPickOf && this.cherryPickOf === other.hash) return true
    if (other.cherryPickOf && other.cherryPickOf === this.hash) return true
    return this.subject === other.subject
  }

  ticketId(pattern) {
    const match = this.subject.match(pattern)
    return match?.[0]
  }
}
