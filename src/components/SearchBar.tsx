import type { Mode, SearchResult } from '../trie/search'

interface Props {
  query: string
  mode: Mode
  budget: number
  search: SearchResult
  selectedId: number | null
  onQuery: (q: string) => void
  onMode: (m: Mode) => void
  onBudget: (b: number) => void
  onPlant: (word: string) => void
  onUproot: (word: string) => void
  onSelect: (id: number | null) => void
}

const CHIP_LIMIT = 14

export function SearchBar(p: Props) {
  const { query, mode, budget, search } = p
  const word = query.trim().toLowerCase()
  const exact = search.matches.find((m) => m.word === word && m.distance === 0)
  const shown = search.matches.slice(0, CHIP_LIMIT)
  const overflow = search.matches.length - shown.length

  return (
    <section className="rounded-2xl border border-linen-deep bg-parchment p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative grow basis-64">
          <span className="sr-only">Search or plant a word</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => p.onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && word) p.onPlant(word)
              if (e.key === 'Escape') p.onQuery('')
            }}
            placeholder={mode === 'prefix' ? 'Type a prefix… e.g. ca' : 'Type a misspelling… e.g. cst'}
            spellCheck={false}
            autoComplete="off"
            className="w-full rounded-xl border border-linen-deep bg-white px-4 py-2.5 font-sans text-lg text-ink outline-none transition focus:border-sage focus:ring-4 focus:ring-sage-soft/60"
          />
          {word && (
            <span className="pointer-events-none absolute inset-y-0 right-3 hidden items-center text-xs text-ink-soft sm:flex">
              Enter to {exact ? 'water' : 'plant'} “{word}”
            </span>
          )}
        </label>

        <div className="flex items-center gap-2">
          <div role="radiogroup" aria-label="Search mode" className="flex rounded-xl bg-linen p-1">
            {(['prefix', 'fuzzy'] as Mode[]).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={mode === m}
                onClick={() => p.onMode(m)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition ${
                  mode === m ? 'bg-moss text-white shadow' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div
            className={`flex items-center gap-1 rounded-xl bg-linen p-1 transition ${mode === 'fuzzy' ? '' : 'pointer-events-none opacity-40'}`}
            aria-label="Edit distance budget"
            aria-disabled={mode !== 'fuzzy'}
          >
            <span className="px-2 text-xs font-semibold text-ink-soft">edits ≤</span>
            {[0, 1, 2].map((b) => (
              <button
                key={b}
                onClick={() => p.onBudget(b)}
                className={`h-8 w-8 rounded-lg text-sm font-bold transition ${
                  budget === b ? 'bg-clay text-white shadow' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex min-h-9 flex-wrap items-center gap-2">
        {!search.active && (
          <p className="text-sm text-ink-soft">
            Suggestions sprout here, ranked by frequency then alphabet. The grove dims to the matched branch.
          </p>
        )}
        {search.active && search.matches.length === 0 && (
          <p className="text-sm text-ink-soft">
            {mode === 'prefix'
              ? search.matchedPrefix
                ? `Nothing grows past “${search.matchedPrefix}”. Press Enter to plant “${word}”.`
                : `No branch starts with “${word}”. Press Enter to plant it.`
              : `Nothing within ${budget} edit${budget === 1 ? '' : 's'} of “${word}”. Try a bigger budget.`}
          </p>
        )}
        {shown.map((m, i) => {
          const isSel = p.selectedId === m.node.id
          return (
            <span
              key={m.word}
              className={`chip group inline-flex items-center gap-1.5 rounded-full border py-1 pr-1.5 pl-3 text-sm font-semibold transition ${
                isSel
                  ? 'border-clay bg-clay/10 text-soil-deep'
                  : 'border-sage-soft bg-sage-soft/50 text-moss-deep hover:bg-sage-soft'
              }`}
              style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
            >
              <button onClick={() => p.onSelect(isSel ? null : m.node.id)} className="inline-flex items-center gap-1.5">
                <span className="font-sans">
                  {mode === 'prefix' ? (
                    <>
                      <mark className="rounded-sm bg-chartreuse/70 px-0.5 text-inherit">{m.word.slice(0, search.matchedPrefix.length)}</mark>
                      {m.word.slice(search.matchedPrefix.length)}
                    </>
                  ) : (
                    m.word
                  )}
                </span>
                <span className="rounded-full bg-white/80 px-1.5 text-[11px] tabular-nums text-ink-soft" title="frequency">
                  ×{m.count}
                </span>
                {mode === 'fuzzy' && (
                  <span
                    className={`rounded-full px-1.5 text-[11px] tabular-nums ${m.distance === 0 ? 'bg-chartreuse/70 text-moss-deep' : 'bg-clay/15 text-clay'}`}
                    title="edit distance"
                  >
                    {m.distance === 0 ? 'exact' : `d${m.distance}`}
                  </span>
                )}
              </button>
              <button
                aria-label={`Uproot ${m.word}`}
                title="Uproot (delete word)"
                onClick={() => p.onUproot(m.word)}
                className="grid h-5 w-5 place-items-center rounded-full text-ink-soft opacity-0 transition group-hover:opacity-100 hover:bg-clay hover:text-white focus:opacity-100"
              >
                ×
              </button>
            </span>
          )
        })}
        {overflow > 0 && <span className="text-xs text-ink-soft">+{overflow} more</span>}
      </div>
    </section>
  )
}
