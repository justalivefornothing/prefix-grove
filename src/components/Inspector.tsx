import type { Trie, TrieNode } from '../trie/Trie'
import { Panel } from './Panel'

interface Props {
  trie: Trie
  node: TrieNode | null
  compressed: boolean
  onSearch: (prefix: string) => void
  onUproot: (word: string) => void
  onSelect: (id: number | null) => void
}

export function Inspector({ trie, node, compressed, onSearch, onUproot, onSelect }: Props) {
  if (!node) {
    return (
      <Panel title="Node inspector">
        <p className="text-sm text-ink-soft">
          Click any knot or leaf in the grove, or a suggestion chip, to inspect it: prefix, children, terminal
          flag and subtree word count. Then step through the tree with the parent and child buttons.
        </p>
      </Panel>
    )
  }

  const prefix = trie.prefixOf(node)
  const isRoot = node.parent === null
  const kids = [...node.children.values()].sort((a, b) => (a.char < b.char ? -1 : 1))
  // in compressed mode, the drawn branch spans a chain; show what it collapsed
  let chain = ''
  if (compressed) {
    let n: TrieNode | null = node.parent
    const parts: string[] = []
    while (n && n.parent && n.count === 0 && n.children.size === 1) {
      parts.push(n.char)
      n = n.parent
    }
    chain = parts.reverse().join('')
  }

  return (
    <Panel
      title="Node inspector"
      action={
        <button onClick={() => onSelect(null)} className="text-xs text-ink-soft hover:text-ink">
          clear
        </button>
      }
    >
      <p className="font-serif text-3xl leading-none text-moss-deep">
        {isRoot ? <span className="italic text-ink-soft">root</span> : prefix}
      </p>
      {chain && (
        <p className="mt-1 text-xs text-ink-soft">
          compressed edge “{chain}{node.char}” stands for {chain.length + 1} nodes
        </p>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Row k="terminal" v={node.count > 0 ? `yes · frequency ×${node.count}` : 'no'} hi={node.count > 0} />
        <Row k="depth" v={String(node.depth)} />
        <Row k="words in subtree" v={String(node.words)} />
        <Row k="node id" v={`#${node.id}`} />
        <Row k="edge char" v={isRoot ? '—' : `“${node.char}”`} />
        <dt className="text-ink-soft">children</dt>
        <dd className="flex flex-wrap gap-1">
          {kids.length === 0 && <span className="font-semibold text-ink">0 (leaf)</span>}
          {kids.map((k) => (
            <button
              key={k.id}
              onClick={() => onSelect(k.id)}
              title={`Inspect “${prefix}${k.char}”`}
              className={`h-6 min-w-6 rounded-md border px-1 font-sans text-xs font-bold transition ${
                k.count > 0
                  ? 'border-sage bg-sage-soft/60 text-moss-deep hover:bg-sage-soft'
                  : 'border-linen-deep bg-white text-ink hover:border-moss'
              }`}
            >
              {k.char}
            </button>
          ))}
        </dd>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        {node.parent && (
          <button
            onClick={() => onSelect(node.parent!.id)}
            className="rounded-lg border border-linen-deep px-3 py-1.5 text-sm font-semibold text-ink-soft hover:border-moss hover:text-moss-deep"
          >
            ↓ parent
          </button>
        )}
        {!isRoot && (
          <button
            onClick={() => onSearch(prefix)}
            className="rounded-lg bg-moss px-3 py-1.5 text-sm font-semibold text-white hover:bg-moss-deep"
          >
            Autocomplete “{prefix}”
          </button>
        )}
        {node.count > 0 && (
          <button
            onClick={() => onUproot(prefix)}
            className="rounded-lg border border-clay px-3 py-1.5 text-sm font-semibold text-clay hover:bg-clay hover:text-white"
          >
            Uproot word
          </button>
        )}
      </div>
    </Panel>
  )
}

function Row({ k, v, hi }: { k: string; v: string; hi?: boolean }) {
  return (
    <>
      <dt className="text-ink-soft">{k}</dt>
      <dd className={`font-semibold tabular-nums ${hi ? 'text-chartreuse-deep' : 'text-ink'}`}>{v}</dd>
    </>
  )
}
