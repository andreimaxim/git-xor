export class Commit {
  constructor(hash, subject, files) {
    this.hash = hash
    this.subject = subject
    this.files = files
  }

  static fromLog(logOutput, getFiles) {
    if (!logOutput) return []

    const commits = []
    for (const line of logOutput.split("\n")) {
      if (!line.trim()) continue

      // Parse: <hash> <parent(s)> <subject>
      // Parents are space-separated, so merge commits have 2+ parent hashes
      const firstSpace = line.indexOf(" ")
      const hash = line.slice(0, firstSpace)
      const rest = line.slice(firstSpace + 1)

      // Find where subject starts: after all parent hashes (40-char hex each)
      const parts = rest.split(" ")
      const parents = []
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
      const files = getFiles(hash)

      commits.push(new Commit(hash, subject, files))
    }

    return commits
  }

  sameAs(other) {
    if (this.hash === other.hash) return true
    if (this.subject !== other.subject) return false
    return this.files.some((f) => other.files.includes(f))
  }

  ticketId(pattern) {
    const match = this.subject.match(pattern)
    return match?.[0]
  }
}
