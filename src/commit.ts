export class Commit {
  readonly hash: string
  readonly subject: string
  readonly files: string[]

  constructor(hash: string, subject: string, files: string[]) {
    this.hash = hash
    this.subject = subject
    this.files = files
  }

  sameAs(other: Commit): boolean {
    if (this.hash === other.hash) return true
    if (this.subject !== other.subject) return false
    return this.files.some((f) => other.files.includes(f))
  }

  ticketId(pattern: RegExp): string | undefined {
    const match = this.subject.match(pattern)
    return match?.[0]
  }
}
