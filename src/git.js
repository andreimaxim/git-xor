import { execFileSync } from "node:child_process"

export function git(...args) {
  return execFileSync("git", args, { encoding: "utf-8" }).trim()
}

export function readGitconfig() {
  const config = {}

  try {
    config.ticketPattern = git("config", "--get", "xor.ticket-pattern")
  } catch {
    // Key not set
  }

  try {
    config.ticketUrl = git("config", "--get", "xor.ticket-url")
  } catch {
    // Key not set
  }

  return config
}

export function getMergeBase(ours, theirs) {
  try {
    return git("merge-base", ours, theirs)
  } catch {
    console.error(`Error: cannot find merge-base for ${ours} and ${theirs}`)
    process.exit(1)
  }
}

export function getLog(base, branch) {
  try {
    return git(
      "log",
      "--reverse",
      "--format=%H%x00%P%x00%s%x00%an%x00%ae%x00%aI%x00%b%x1e",
      `${base}..${branch}`
    )
  } catch {
    console.error(`Error: branch '${branch}' does not exist`)
    process.exit(1)
  }
}

export function getCommitSubject(hash) {
  return git("log", "-1", "--format=%s", hash)
}
