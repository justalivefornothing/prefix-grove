import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Grove } from './components/Grove'
import { Inspector } from './components/Inspector'
import { Panel } from './components/Panel'
import { SearchBar } from './components/SearchBar'
import { StatsBar } from './components/StatsBar'
import { WordLoader } from './components/WordLoader'
import { WORDS, weightFor } from './data/words'
import { Trie } from './trie/Trie'
import { layoutTrie } from './trie/layout'
import { runSearch, type Mode } from './trie/search'
import { tokenize } from './trie/tokenize'

/** Starter garden: the words from the demo plus a potting-shed vocabulary, with frequencies. */
const GARDEN: [string, number][] = [
  ['cat', 5], ['car', 3], ['cart', 1], ['care', 2], ['card', 1], ['cane', 1], ['canopy', 1],
  ['garden', 4], ['grove', 2], ['grow', 3], ['green', 3], ['leaf', 4], ['leaves', 2],
  ['loam', 1], ['moss', 2], ['mint', 1], ['mulch', 1], ['plant', 5], ['plane', 1], ['planet', 1],
  ['petal', 2], ['pot', 3], ['pod', 1], ['root', 3], ['rose', 2], ['row', 1],
  ['seed', 4], ['seedling', 1], ['soil', 3], ['sow', 1], ['sage', 2], ['sprout', 2], ['stem', 2],
  ['tree', 4], ['trellis', 1], ['trowel', 1], ['vine', 2], ['water', 3], ['weed', 2], ['wind', 1],
]

const ANIMATE_MAX = 600

/** Initial search state from the URL, so a search can be shared as a link (?q=ca&mode=fuzzy&d=2). */
function readUrlState(): { query: string; mode: Mode; budget: number } {
  const p = new URLSearchParams(window.location.search)
  const d = Number(p.get('d') ?? 1)
  return {
    query: p.get('q') ?? '',
    mode: p.get('mode') === 'fuzzy' ? 'fuzzy' : 'prefix',
    budget: Number.isInteger(d) && d >= 0 && d <= 2 ? d : 1,
  }
}

export default function App() {
  // the trie is a mutable instance; `version` is bumped after every mutation to re-render
  const [t] = useState(() => {
    const tr = new Trie()
    for (const [w, n] of GARDEN) tr.insert(w, n)
    return tr
  })

  const [version, setVersion] = useState(0)
  const [initial] = useState(readUrlState)
  const [query, setQuery] = useState(initial.query)
  const [mode, setMode] = useState<Mode>(initial.mode)
  const [budget, setBudget] = useState(initial.budget)
  const [compressed, setCompressed] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [fresh, setFresh] = useState<{ cursor: number; animate: boolean }>({ cursor: Infinity, animate: false })
  const [groveWidth, setGroveWidth] = useState(1100)
  const main = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = main.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => e && setGroveWidth(Math.floor(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // mirror the search into the URL without adding history entries
  useEffect(() => {
    const p = new URLSearchParams()
    if (query) p.set('q', query)
    if (mode === 'fuzzy') {
      p.set('mode', 'fuzzy')
      p.set('d', String(budget))
    }
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [query, mode, budget])

  /** Run a mutation against the trie, remember which nodes are new, and re-render. */
  const mutate = useCallback(
    (fn: (trie: Trie) => void) => {
      const cursor = t.idCursor()
      fn(t)
      const created = t.idCursor() - cursor
      setFresh({ cursor, animate: created > 0 && created <= ANIMATE_MAX })
      setVersion((v) => v + 1)
    },
    [t],
  )

  const plant = useCallback((word: string) => mutate((tr) => tr.insert(word)), [mutate])
  const uproot = useCallback(
    (word: string) => {
      const node = t.find(word)
      if (selectedId !== null && node && node.id === selectedId) setSelectedId(null)
      mutate((tr) => tr.delete(word))
    },
    [mutate, t, selectedId],
  )
  const paste = useCallback(
    (text: string) => {
      const words = tokenize(text)
      if (words.length) mutate((tr) => words.forEach((w) => tr.insert(w)))
      return words.length
    },
    [mutate],
  )
  const loadBundled = useCallback(() => {
    setSelectedId(null)
    mutate((tr) => {
      tr.clear()
      WORDS.forEach((w, i) => tr.insert(w, weightFor(i)))
    })
  }, [mutate])
  const replant = useCallback(() => {
    setSelectedId(null)
    mutate((tr) => {
      tr.clear()
      for (const [w, n] of GARDEN) tr.insert(w, n)
    })
  }, [mutate])
  const clear = useCallback(() => {
    setSelectedId(null)
    setFresh({ cursor: Infinity, animate: false })
    mutate((tr) => tr.clear())
  }, [mutate])

  // a fresh snapshot identity per mutation lets memos key off trie contents without cloning it
  const snap = useMemo(() => ({ trie: t, version }), [t, version])

  const layout = useMemo(() => layoutTrie(snap.trie, compressed, groveWidth), [snap, compressed, groveWidth])
  const search = useMemo(
    () => runSearch(snap.trie, query.trim().toLowerCase(), mode, budget),
    [snap, query, mode, budget],
  )

  const selected = useMemo(() => {
    if (selectedId === null) return null
    for (const n of snap.trie.walk()) if (n.id === selectedId) return n
    return null
  }, [snap, selectedId])

  const totalWords = t.wordCount()

  return (
    <div ref={main} className="mx-auto flex min-h-dvh max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold text-moss-deep sm:text-5xl">Prefix Grove</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-soft sm:text-base">
            A trie that grows like a plant as you type. Every branch is one shared character; every leaf is a
            word. Search a prefix to light its branch, or switch to fuzzy mode to watch the edit-distance walk
            prune the grove.
          </p>
        </div>
        <StatsBar trie={t} drawn={layout.nodes.length - 1} compressed={compressed} />
      </header>

      <SearchBar
        query={query}
        mode={mode}
        budget={budget}
        search={search}
        selectedId={selectedId}
        onQuery={setQuery}
        onMode={setMode}
        onBudget={setBudget}
        onPlant={plant}
        onUproot={uproot}
        onSelect={setSelectedId}
      />

      <Grove
        layout={layout}
        search={search}
        selectedId={selectedId}
        freshCursor={fresh.cursor}
        animate={fresh.animate}
        onSelect={setSelectedId}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Inspector
          trie={t}
          node={selected}
          compressed={compressed}
          onSearch={(prefix) => {
            setMode('prefix')
            setQuery(prefix)
          }}
          onUproot={uproot}
          onSelect={setSelectedId}
        />
        <WordLoader
          wordCount={totalWords}
          compressed={compressed}
          onCompressed={setCompressed}
          onLoadBundled={loadBundled}
          onReplantGarden={replant}
          onPaste={paste}
          onClear={clear}
        />
        <Panel title="Reading the grove">
          <ul className="space-y-1.5 text-sm text-ink-soft">
            <li className="flex items-center gap-2">
              <Swatch className="bg-moss" /> branch: one trie node, thicker when more words pass through it
            </li>
            <li className="flex items-center gap-2">
              <Swatch className="bg-sage" leaf /> leaf: a word ends here; bigger when inserted more often
            </li>
            <li className="flex items-center gap-2">
              <Swatch className="bg-chartreuse-deep" /> lit: on the matched prefix path or a fuzzy match path
            </li>
            <li className="flex items-center gap-2">
              <Swatch className="bg-moss opacity-60" /> fuzzy: explored, its DP row stayed within budget
            </li>
            <li className="flex items-center gap-2">
              <Swatch className="bg-clay opacity-60" /> pruned: every cell of its DP row exceeded the budget
            </li>
            <li className="flex items-center gap-2">
              <Swatch className="bg-moss opacity-[0.16]" /> dimmed: not touched by this search
            </li>
          </ul>
          <p className="mt-3 text-xs text-ink-soft">
            Fuzzy search carries one Levenshtein row per node, so each child costs O(|query|) instead of a full
            table. Compress mode folds single-child chains into radix-style edges.
          </p>
        </Panel>
      </div>

      <footer className="mt-auto pt-2 text-center text-xs text-ink-soft">
        Built from scratch in TypeScript: Map-based trie with terminal counts, bounded DFS autocomplete, DP-row
        fuzzy walk. No graph libraries.
      </footer>
    </div>
  )
}

function Swatch({ className, leaf }: { className: string; leaf?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-3 shrink-0 ${leaf ? 'w-4 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] -rotate-12' : 'w-4 rounded-sm'} ${className}`}
    />
  )
}
