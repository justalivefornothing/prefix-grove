import { fuzzySearch } from './fuzzy'

export interface TrieNode {
  readonly id: number
  /** Single code point on the edge from the parent; '' for the root. */
  readonly char: string
  readonly depth: number
  readonly parent: TrieNode | null
  readonly children: Map<string, TrieNode>
  /** How many times the word ending here was inserted. 0 means "not a word". */
  count: number
  /** Distinct words in the subtree rooted here (inclusive). */
  words: number
}

export interface Suggestion {
  word: string
  count: number
  node: TrieNode
}

/** Map-based trie with per-node frequency counts and subtree word totals. */
export class Trie {
  readonly root: TrieNode
  private nodes = 0
  private distinct = 0
  private insertions = 0
  private chars = 0
  private nextId = 0

  constructor() {
    this.root = this.makeNode('', null)
  }

  private makeNode(char: string, parent: TrieNode | null): TrieNode {
    return {
      id: this.nextId++,
      char,
      depth: parent ? parent.depth + 1 : 0,
      parent,
      children: new Map(),
      count: 0,
      words: 0,
    }
  }

  /** Insert `word` `times` times; creates only the missing suffix nodes. */
  insert(word: string, times = 1): TrieNode {
    let node = this.root
    for (const ch of word) {
      let child = node.children.get(ch)
      if (!child) {
        child = this.makeNode(ch, node)
        node.children.set(ch, child)
        this.nodes++
      }
      node = child
    }
    if (node.count === 0) {
      this.distinct++
      this.chars += node.depth
      for (let n: TrieNode | null = node; n; n = n.parent) n.words++
    }
    node.count += times
    this.insertions += times
    return node
  }

  /** Remove a word entirely, pruning nodes no other word needs. */
  delete(word: string): boolean {
    const node = this.find(word)
    if (!node || node.count === 0) return false
    this.insertions -= node.count
    this.distinct--
    this.chars -= node.depth
    node.count = 0
    for (let n: TrieNode | null = node; n; n = n.parent) n.words--

    let cur = node
    while (cur.parent && cur.children.size === 0 && cur.count === 0) {
      cur.parent.children.delete(cur.char)
      this.nodes--
      cur = cur.parent
    }
    return true
  }

  /** Node at the end of `prefix`, or null if that path does not exist. */
  find(prefix: string): TrieNode | null {
    let node = this.root
    for (const ch of prefix) {
      const next = node.children.get(ch)
      if (!next) return null
      node = next
    }
    return node
  }

  has(word: string): boolean {
    const node = this.find(word)
    return node !== null && node.count > 0
  }

  frequency(word: string): number {
    return this.find(word)?.count ?? 0
  }

  /** Walk parent links to rebuild the string spelled by the path to `node`. */
  prefixOf(node: TrieNode): string {
    const parts: string[] = []
    for (let n: TrieNode | null = node; n && n.parent; n = n.parent) parts.push(n.char)
    return parts.reverse().join('')
  }

  /** Bounded DFS collecting terminal nodes under `node`, in child order. */
  collect(node: TrieNode, limit = Infinity): Suggestion[] {
    const out: Suggestion[] = []
    const walk = (n: TrieNode, word: string) => {
      if (out.length >= limit) return
      if (n.count > 0) out.push({ word, count: n.count, node: n })
      for (const [ch, child] of n.children) walk(child, word + ch)
    }
    walk(node, this.prefixOf(node))
    return out
  }

  /** Words under `prefix`, most frequent first, ties broken alphabetically. */
  suggest(prefix: string, limit = Infinity): Suggestion[] {
    const node = this.find(prefix)
    if (!node) return []
    return this.collect(node)
      .sort((a, b) => b.count - a.count || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0))
      .slice(0, limit)
  }

  autocomplete(prefix: string, limit = Infinity): string[] {
    return this.suggest(prefix, limit).map((s) => s.word)
  }

  /** Words within `budget` edits of `query`, closest first. */
  fuzzy(query: string, budget: number, limit = Infinity): string[] {
    return fuzzySearch(this, query, budget)
      .matches.slice(0, limit)
      .map((m) => m.word)
  }

  /** Pre-order traversal of every node including the root. */
  *walk(from: TrieNode = this.root): Generator<TrieNode> {
    yield from
    for (const child of from.children.values()) yield* this.walk(child)
  }

  /** Next id that will be handed out; nodes with id >= a saved cursor were created after it. */
  idCursor(): number {
    return this.nextId
  }

  /** Number of nodes excluding the root. */
  nodeCount(): number {
    return this.nodes
  }

  /** Distinct words stored. */
  wordCount(): number {
    return this.distinct
  }

  /** Sum of all frequencies. */
  totalCount(): number {
    return this.insertions
  }

  /** Characters a flat list of the distinct words would need. */
  rawChars(): number {
    return this.chars
  }

  maxDepth(): number {
    let d = 0
    for (const n of this.walk()) if (n.depth > d) d = n.depth
    return d
  }

  clear(): void {
    this.root.children.clear()
    this.root.words = 0
    this.nodes = 0
    this.distinct = 0
    this.insertions = 0
    this.chars = 0
  }
}
