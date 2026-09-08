import type { Trie, TrieNode } from './Trie'

export interface FuzzyMatch {
  word: string
  distance: number
  count: number
  node: TrieNode
}

export interface FuzzyResult {
  /** Closest first, then most frequent, then alphabetical. */
  matches: FuzzyMatch[]
  /** Nodes whose DP row was computed and stayed within budget. */
  visited: Set<number>
  /** Nodes where the whole subtree was cut off: min(row) exceeded the budget. */
  pruned: Set<number>
}

/**
 * Levenshtein search over the trie. Each node carries one DP row: row[j] is the
 * edit distance between the prefix spelled so far and the first j characters of
 * the query. A child extends its parent's row in O(|query|) instead of
 * recomputing the full table, and a subtree is pruned as soon as every cell of
 * its row exceeds the budget, since distances never shrink further down.
 */
export function fuzzySearch(trie: Trie, query: string, budget: number): FuzzyResult {
  const q = [...query]
  const m = q.length
  const matches: FuzzyMatch[] = []
  const visited = new Set<number>()
  const pruned = new Set<number>()

  const walk = (node: TrieNode, row: number[], word: string) => {
    visited.add(node.id)
    const dist = row[m] ?? Infinity
    if (node.count > 0 && dist <= budget) {
      matches.push({ word, distance: dist, count: node.count, node })
    }
    for (const [ch, child] of node.children) {
      const next = new Array<number>(m + 1)
      next[0] = (row[0] ?? 0) + 1
      let min = next[0]
      for (let j = 1; j <= m; j++) {
        const above = (row[j] ?? Infinity) + 1 // extra letter in the word
        const left = (next[j - 1] ?? Infinity) + 1 // missing letter in the word
        const diag = (row[j - 1] ?? Infinity) + (q[j - 1] === ch ? 0 : 1)
        const best = Math.min(above, left, diag)
        next[j] = best
        if (best < min) min = best
      }
      if (min > budget) pruned.add(child.id)
      else walk(child, next, word + ch)
    }
  }

  const first = Array.from({ length: m + 1 }, (_, j) => j)
  walk(trie.root, first, '')

  matches.sort(
    (a, b) =>
      a.distance - b.distance ||
      b.count - a.count ||
      (a.word < b.word ? -1 : a.word > b.word ? 1 : 0),
  )
  return { matches, visited, pruned }
}
