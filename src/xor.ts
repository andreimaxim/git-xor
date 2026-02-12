import type { Commit } from "./commit.ts"

export interface XorResult {
  matched: Array<[Commit, Commit]>
  onlyInOurs: Commit[]
  onlyInTheirs: Commit[]
  warnings: string[]
}

export function xor(ours: Commit[], theirs: Commit[]): XorResult {
  // Pass 1: Walk ours oldest-first, match against theirs
  const consumedTheirs1 = new Set<number>()
  const pass1Matched: Array<[Commit, Commit]> = []
  const pass1OnlyOurs: Commit[] = []

  for (const ourCommit of ours) {
    let found = false
    for (let j = 0; j < theirs.length; j++) {
      if (consumedTheirs1.has(j)) continue
      if (ourCommit.sameAs(theirs[j]!)) {
        pass1Matched.push([ourCommit, theirs[j]!])
        consumedTheirs1.add(j)
        found = true
        break
      }
    }
    if (!found) pass1OnlyOurs.push(ourCommit)
  }

  // Pass 2: Walk theirs oldest-first, match against ours
  const consumedOurs2 = new Set<number>()
  const pass2Matched: Array<[Commit, Commit]> = []
  const pass2OnlyTheirs: Commit[] = []

  for (const theirCommit of theirs) {
    let found = false
    for (let i = 0; i < ours.length; i++) {
      if (consumedOurs2.has(i)) continue
      if (theirCommit.sameAs(ours[i]!)) {
        pass2Matched.push([ours[i]!, theirCommit])
        consumedOurs2.add(i)
        found = true
        break
      }
    }
    if (!found) pass2OnlyTheirs.push(theirCommit)
  }

  // Cross-check: compare matched pairs from both passes
  const warnings: string[] = []
  const pass2Map = new Map<string, string>()
  for (const [o, t] of pass2Matched) {
    pass2Map.set(o.hash, t.hash)
  }

  for (const [o, t] of pass1Matched) {
    const pass2TheirHash = pass2Map.get(o.hash)
    if (pass2TheirHash !== undefined && pass2TheirHash !== t.hash) {
      warnings.push(`${o.hash}: pass1→${t.hash}, pass2→${pass2TheirHash}  ${o.subject}`)
    }
  }

  return {
    matched: pass1Matched,
    onlyInOurs: pass1OnlyOurs,
    onlyInTheirs: pass2OnlyTheirs,
    warnings
  }
}
