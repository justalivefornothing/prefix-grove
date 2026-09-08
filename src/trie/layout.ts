import type { Trie, TrieNode } from './Trie'

/** One drawn branch. In compressed mode a branch may cover a chain of trie nodes. */
export interface VNode {
  /** id of the trie node at the tip of the branch */
  key: number
  node: TrieNode
  /** every trie node id this branch stands for (chain in compressed mode) */
  ids: number[]
  /** edge label: one char normally, a run of chars when compressed */
  label: string
  prefix: string
  depth: number
  x: number
  y: number
  /** base of the branch (parent tip, or the soil line for the root) */
  px: number
  py: number
  parentKey: number
  terminal: boolean
  leaf: boolean
  /** stroke width at the tip */
  width: number
  /** tapered polygon path for the branch */
  edge: string
}

export interface Layout {
  nodes: VNode[]
  /** trie node id -> branch that draws it */
  byId: Map<number, VNode>
  width: number
  height: number
  maxDepth: number
  col: number
}

export const ROW = 38
export const PAD_X = 28
export const PAD_TOP = 34
export const SOIL = 26

interface Draft {
  node: TrieNode
  ids: number[]
  label: string
  prefix: string
  depth: number
  children: Draft[]
  x: number
}

export function layoutTrie(trie: Trie, compressed: boolean, targetWidth = 900): Layout {
  const root = trie.root
  const totalWords = Math.max(1, root.words)
  let leaves = 0
  let maxDepth = 0

  const build = (start: TrieNode, depth: number, prefix: string): Draft => {
    let node = start
    const ids = [node.id]
    let label = node.char
    if (compressed) {
      while (node.count === 0 && node.children.size === 1) {
        node = node.children.values().next().value as TrieNode
        ids.push(node.id)
        label += node.char
      }
    }
    const here = prefix + label
    const kids = [...node.children.values()].sort((a, b) => (a.char < b.char ? -1 : 1))
    const draft: Draft = {
      node,
      ids,
      label,
      prefix: here,
      depth,
      children: kids.map((k) => build(k, depth + 1, here)),
      x: 0,
    }
    if (draft.children.length === 0) draft.x = leaves++
    else {
      const first = draft.children[0]!
      const last = draft.children[draft.children.length - 1]!
      draft.x = (first.x + last.x) / 2
    }
    if (depth > maxDepth) maxDepth = depth
    return draft
  }

  const tree = build(root, 0, '')
  const leafCount = Math.max(1, leaves)
  const col = Math.min(48, Math.max(16, Math.floor((targetWidth - PAD_X * 2) / leafCount)))
  const width = Math.max(targetWidth, PAD_X * 2 + (leafCount - 1) * col)
  const offset = (width - (leafCount - 1) * col) / 2
  const height = PAD_TOP + maxDepth * ROW + SOIL + 22

  const nodes: VNode[] = []
  const byId = new Map<number, VNode>()
  const widthOf = (n: TrieNode) => 1.6 + 6.5 * Math.sqrt(n.words / totalWords)

  const place = (d: Draft, px: number, py: number, parentKey: number, parentWidth: number) => {
    const x = offset + d.x * col
    const y = PAD_TOP + (maxDepth - d.depth) * ROW
    const w = widthOf(d.node)
    // children first so parents paint their knots over the branch bases
    for (const c of d.children) place(c, x, y, d.node.id, w)
    const v: VNode = {
      key: d.node.id,
      node: d.node,
      ids: d.ids,
      label: d.label,
      prefix: d.prefix,
      depth: d.depth,
      x,
      y,
      px,
      py,
      parentKey,
      terminal: d.node.count > 0,
      leaf: d.children.length === 0,
      width: w,
      edge: taperedPath(px, py, x, y, Math.min(parentWidth, w * 1.9), w),
    }
    nodes.push(v)
    for (const id of d.ids) byId.set(id, v)
  }

  const rootX = offset + tree.x * col
  place(tree, rootX, height - SOIL + 6, -1, widthOf(root) * 1.35)

  return { nodes, byId, width, height, maxDepth, col }
}

/**
 * A cubic S-curve from (px,py) up to (x,y), widened into a filled polygon whose
 * width eases from w0 at the base to w1 at the tip.
 */
export function taperedPath(
  px: number,
  py: number,
  x: number,
  y: number,
  w0: number,
  w1: number,
  steps = 8,
): string {
  const dy = py - y
  const c1y = py - dy * 0.42
  const c2y = y + dy * 0.42
  const left: string[] = []
  const right: string[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const mt = 1 - t
    const bx = mt * mt * mt * px + 3 * mt * mt * t * px + 3 * mt * t * t * x + t * t * t * x
    const by = mt * mt * mt * py + 3 * mt * mt * t * c1y + 3 * mt * t * t * c2y + t * t * t * y
    const dx = 6 * mt * t * (x - px)
    const dyy = 3 * mt * mt * (c1y - py) + 6 * mt * t * (c2y - c1y) + 3 * t * t * (y - c2y)
    const len = Math.hypot(dx, dyy) || 1
    const nx = -dyy / len
    const ny = dx / len
    const hw = (w0 + (w1 - w0) * t) / 2
    left.push(`${r1(bx + nx * hw)} ${r1(by + ny * hw)}`)
    right.push(`${r1(bx - nx * hw)} ${r1(by - ny * hw)}`)
  }
  return `M${left.join('L')}L${right.reverse().join('L')}Z`
}

const r1 = (n: number) => Math.round(n * 10) / 10
