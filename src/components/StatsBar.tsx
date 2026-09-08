import type { Trie } from '../trie/Trie'

interface Props {
  trie: Trie
  /** branches actually drawn (fewer than nodes when compressed) */
  drawn: number
  compressed: boolean
}

const fmt = (n: number) => n.toLocaleString('en-US')

export function StatsBar({ trie, drawn, compressed }: Props) {
  const nodes = trie.nodeCount()
  const words = trie.wordCount()
  const raw = trie.rawChars()
  const saved = raw - nodes
  const pct = raw > 0 ? Math.round((saved / raw) * 100) : 0

  return (
    <dl className="flex flex-wrap items-stretch gap-2 text-sm">
      <Stat k="nodes" v={fmt(nodes)} sub={compressed ? `${fmt(drawn)} edges drawn` : 'one char each'} />
      <Stat k="words" v={fmt(words)} sub={`${fmt(trie.totalCount())} insertions`} />
      <Stat k="raw chars" v={fmt(raw)} sub="flat string list" />
      <Stat
        k="saved"
        v={raw > 0 ? `${pct}%` : '—'}
        sub={saved >= 0 ? `${fmt(saved)} chars shared` : `${fmt(-saved)} chars overhead`}
        accent
      />
    </dl>
  )
}

function Stat({ k, v, sub, accent }: { k: string; v: string; sub: string; accent?: boolean }) {
  return (
    <div
      className={`min-w-28 rounded-xl border px-3 py-1.5 ${
        accent ? 'border-chartreuse-deep/40 bg-chartreuse/20' : 'border-linen-deep bg-parchment'
      }`}
    >
      <dt className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">{k}</dt>
      <dd className="font-serif text-xl leading-tight text-soil-deep tabular-nums">{v}</dd>
      <dd className="text-[11px] text-ink-soft">{sub}</dd>
    </div>
  )
}
