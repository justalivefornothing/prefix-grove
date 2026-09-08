import { useState } from 'react'
import { WORDS } from '../data/words'
import { Panel } from './Panel'

interface Props {
  wordCount: number
  compressed: boolean
  onCompressed: (v: boolean) => void
  onLoadBundled: () => void
  onReplantGarden: () => void
  onPaste: (text: string) => number
  onClear: () => void
}

export function WordLoader(p: Props) {
  const [text, setText] = useState('')
  const [note, setNote] = useState<string | null>(null)

  const plant = () => {
    const n = p.onPaste(text)
    setNote(n ? `Planted ${n.toLocaleString('en-US')} word${n === 1 ? '' : 's'}.` : 'Nothing to plant.')
    if (n) setText('')
  }

  return (
    <Panel title="Seeds">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            p.onLoadBundled()
            setNote(`Loaded ${WORDS.length.toLocaleString('en-US')} common words, weighted by rank.`)
          }}
          className="rounded-lg bg-moss px-3 py-1.5 text-sm font-semibold text-white hover:bg-moss-deep"
        >
          Load {WORDS.length.toLocaleString('en-US')}-word list
        </button>
        <button
          onClick={() => {
            p.onReplantGarden()
            setNote('Replanted the starter garden.')
          }}
          className="rounded-lg border border-moss px-3 py-1.5 text-sm font-semibold text-moss hover:bg-sage-soft/60"
        >
          Starter garden
        </button>
        <button
          onClick={() => {
            p.onClear()
            setNote('Cleared the grove.')
          }}
          disabled={p.wordCount === 0}
          className="rounded-lg border border-linen-deep px-3 py-1.5 text-sm font-semibold text-ink-soft hover:border-clay hover:text-clay disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      <label className="mt-3 block">
        <span className="text-xs font-semibold text-ink-soft">Paste your own (any whitespace or commas between words; repeats raise frequency)</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="fern moss fern lichen…"
          spellCheck={false}
          className="mt-1 w-full resize-y rounded-xl border border-linen-deep bg-white px-3 py-2 font-sans text-sm outline-none focus:border-sage focus:ring-4 focus:ring-sage-soft/60"
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={plant}
          disabled={!text.trim()}
          className="rounded-lg bg-sage px-3 py-1.5 text-sm font-semibold text-white hover:bg-moss disabled:opacity-40"
        >
          Plant pasted words
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={p.compressed}
            onChange={(e) => p.onCompressed(e.target.checked)}
            className="h-4 w-4 accent-[#5c7a4c]"
          />
          <span className="font-semibold text-ink">Compress chains</span>
          <span className="text-xs text-ink-soft">(radix-tree edges)</span>
        </label>
      </div>
      {note && <p className="mt-2 text-xs text-moss-deep">{note}</p>}
    </Panel>
  )
}
