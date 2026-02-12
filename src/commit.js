const CHERRY_PICK_RE = /\(cherry picked from commit ([0-9a-f]{40})\)/

export class Commit {
  static parse(record) {
    const fields = record.split("\x00")
    if (fields.length < 6) return null

    const hash = fields[0].trim()
    const parentStr = fields[1].trim()
    const parents = parentStr ? parentStr.split(/\s+/) : []

    // Skip merge commits (multiple parents)
    if (parents.length > 1) return null

    const body = fields[6] || ""
    const cpMatch = body.match(CHERRY_PICK_RE)

    return new Commit({
      hash,
      subject: fields[2],
      cherryPickOf: cpMatch?.[1],
      authorName: fields[3],
      authorEmail: fields[4],
      authorDate: fields[5]
    })
  }

  static fromLog(logOutput) {
    if (!logOutput) return []

    return logOutput
      .split("\x1e")
      .filter((record) => record.trim())
      .map((record) => Commit.parse(record))
      .filter((commit) => commit !== null)
  }

  constructor({ hash, subject, cherryPickOf, authorName, authorEmail, authorDate }) {
    this.hash = hash
    this.subject = subject
    this.cherryPickOf = cherryPickOf
    this.authorName = authorName
    this.authorEmail = authorEmail
    this.authorDate = authorDate
  }

  sameAs(other) {
    if (this.hash === other.hash) return true
    if (this.cherryPickOf && this.cherryPickOf === other.hash) return true
    if (other.cherryPickOf && other.cherryPickOf === this.hash) return true
    return (
      this.subject === other.subject &&
      this.authorName === other.authorName &&
      this.authorEmail === other.authorEmail &&
      this.authorDate === other.authorDate
    )
  }

  ticketId(pattern) {
    const match = this.subject.match(pattern)
    return match?.[0]
  }
}
