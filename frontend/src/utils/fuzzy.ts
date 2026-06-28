/**
 * Lightweight fuzzy search scoring — no dependencies.
 *
 * Handles:
 *   - Word-order independence (query tokens matched anywhere in target)
 *   - Typo tolerance (character-level similarity fallback)
 *   - Substring matching (partial word match)
 *
 * Returns 0–1 where 0 = no match, 1 = exact full match.
 */

/** Character-level similarity ratio using longest-common-subsequence-in-order.
 *  "unemploymnet" vs "unemployment" → ~0.92 (one missing char).
 */
function charSimilarity(query: string, target: string): number {
    const q = query.toLowerCase()
    const t = target.toLowerCase()
    if (t.includes(q)) return 1.0

    let qi = 0
    let matches = 0
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) {
            matches++
            qi++
        }
    }

    // Also try skipping leading chars in target (start matching anywhere)
    let best = matches / q.length
    for (let start = 0; start < t.length; start++) {
        qi = 0
        matches = 0
        for (let ti = start; ti < t.length && qi < q.length; ti++) {
            if (t[ti] === q[qi]) {
                matches++
                qi++
            }
        }
        const ratio = matches / q.length
        if (ratio > best) best = ratio
    }

    return best
}

/** Score a single query word against a list of target words.
 *  Returns best match score 0–1.
 */
function tokenScore(queryToken: string, targetTokens: string[]): number {
    if (!queryToken) return 0
    const qt = queryToken.toLowerCase()

    let best = 0
    for (const tt of targetTokens) {
        // Fast path: exact substring
        if (tt.includes(qt)) {
            return 1.0
        }
        // Typo-tolerant path
        const score = charSimilarity(qt, tt)
        if (score > best) best = score
    }
    return best
}

/** Score a multi-word query against target text.
 *
 *  Uses AND logic with tolerance: every query token must score ≥ threshold,
 *  but threshold is lowered (0.3) so fuzzy matches pass.
 *  Final score = average of all token scores.
 */
export function fuzzyScore(query: string, target: string): number {
    if (!query || !query.trim()) return 0
    if (!target) return 0

    const queryTokens = query.toLowerCase().trim().split(/\s+/)
    const targetTokens = target.toLowerCase().split(/\s+/)

    let total = 0
    for (const qt of queryTokens) {
        const score = tokenScore(qt, targetTokens)
        if (score < 0.3) return 0 // at least one token must somewhat match
        total += score
    }

    return total / queryTokens.length
}
