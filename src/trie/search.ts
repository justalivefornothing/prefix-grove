import type { Trie, TrieNode } from './Trie'
import { fuzzySearch } from './fuzzy'

export type Mode = 'prefix' | 'fuzzy'

export interface Match {
  word: string
  count: number
  distance: number
  node: TrieNode
}

export interface SearchResult {
  mode: Mode
  active: boolean
  matches: Match[]
  /** nodes on a highlighted path (prefix path + subtree, or every fuzzy match path) */
  lit: Set<number>
  /** fuzzy only: explored but not on a match path */
  visited: Set<number>
  /** fuzzy only: subtree roots that were cut off */
  pruned: Set<number>
  /** where to scroll the grove to */
  anchor: TrieNode | null
  /** prefix mode: how far the typed prefix actually exists in the trie */
  matchedPrefix: string
}

const EMPTY: SearchResult = {
  mode: 'prefix',
  active: false,
  matches: [],
  lit: new Set(),
  visited: new Set(),
  pruned: new Set(),
  anchor: null,
  matchedPrefix: '',
}

export function runSearch(trie: Trie, query: string, mode: Mode, budget: number): SearchResult {
  if (query.length === 0) return EMPTY
  return mode === 'prefix' ? prefixSearch(trie, query) : fuzzyMode(trie, query, budget)
}

function pathTo(node: TrieNode, into: Set<number>) {
  for (let n: TrieNode | null = node; n; n = n.parent) into.add(n.id)
}

function prefixSearch(trie: Trie, query: string): SearchResult {
  // walk as far as the prefix exists so a dead end still lights the live part
  let node = trie.root
  let matched = ''
  for (const ch of query) {
    const next = node.children.get(ch)
    if (!next) break
    node = next
    matched += ch
  }
  const lit = new Set<number>()
  pathTo(node, lit)
  const complete = matched.length === [...query].length
  if (complete) for (const n of trie.walk(node)) lit.add(n.id)
  const matches: Match[] = complete
    ? trie.suggest(query).map((s) => ({ word: s.word, count: s.count, distance: 0, node: s.node }))
    : []
  return {
    mode: 'prefix',
    active: true,
    matches,
    lit,
    visited: new Set(),
    pruned: new Set(),
    anchor: node,
    matchedPrefix: matched,
  }
}

function fuzzyMode(trie: Trie, query: string, budget: number): SearchResult {
  const r = fuzzySearch(trie, query, budget)
  const lit = new Set<number>()
  for (const m of r.matches) pathTo(m.node, lit)
  return {
    mode: 'fuzzy',
    active: true,
    matches: r.matches,
    lit,
    visited: r.visited,
    pruned: r.pruned,
    anchor: r.matches[0]?.node ?? null,
    matchedPrefix: query,
  }
}
