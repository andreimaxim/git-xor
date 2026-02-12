export function xor(ours, theirs) {
  // Pass 1: Walk ours oldest-first, match against theirs
  const consumedTheirs1 = new Set()
  const pass1Matched = []
  const pass1OnlyOurs = []

  for (const ourCommit of ours) {
    let found = false
    for (let j = 0; j < theirs.length; j++) {
      if (consumedTheirs1.has(j)) continue
      if (ourCommit.sameAs(theirs[j])) {
        pass1Matched.push([ourCommit, theirs[j]])
        consumedTheirs1.add(j)
        found = true
        break
      }
    }
    if (!found) pass1OnlyOurs.push(ourCommit)
  }

  // Pass 2: Walk theirs oldest-first, match against ours
  const consumedOurs2 = new Set()
  const pass2Matched = []
  const pass2OnlyTheirs = []

  for (const theirCommit of theirs) {
    let found = false
    for (let i = 0; i < ours.length; i++) {
      if (consumedOurs2.has(i)) continue
      if (theirCommit.sameAs(ours[i])) {
        pass2Matched.push([ours[i], theirCommit])
        consumedOurs2.add(i)
        found = true
        break
      }
    }
    if (!found) pass2OnlyTheirs.push(theirCommit)
  }

  // Cross-check: compare matched pairs from both passes
  const warnings = []
  const pass2Map = new Map()
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
