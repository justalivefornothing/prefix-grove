import { memo, useEffect, useRef } from 'react'
import type { Layout, VNode } from '../trie/layout'
import { SOIL } from '../trie/layout'
import type { SearchResult } from '../trie/search'

interface Props {
  layout: Layout
  search: SearchResult
  selectedId: number | null
  /** trie node ids >= this were created by the latest insert and should sprout in */
  freshCursor: number
  animate: boolean
  onSelect: (id: number | null) => void
}

type State = 'base' | 'lit' | 'visited' | 'pruned' | 'dim'

function stateOf(v: VNode, s: SearchResult): State {
  if (!s.active) return 'base'
  for (const id of v.ids) if (s.lit.has(id)) return 'lit'
  if (s.mode === 'fuzzy') {
    for (const id of v.ids) if (s.pruned.has(id)) return 'pruned'
    for (const id of v.ids) if (s.visited.has(id)) return 'visited'
  }
  return 'dim'
}

const EDGE_FILL: Record<State, string> = {
  base: 'fill-moss',
  lit: 'fill-chartreuse-deep',
  visited: 'fill-moss opacity-60',
  pruned: 'fill-clay opacity-55',
  dim: 'fill-moss opacity-[0.16]',
}

const LEAF_FILL: Record<State, string> = {
  base: 'fill-sage',
  lit: 'fill-chartreuse',
  visited: 'fill-sage opacity-60',
  pruned: 'fill-clay opacity-55',
  dim: 'fill-sage opacity-[0.16]',
}

function GroveInner({ layout, search, selectedId, freshCursor, animate, onSelect }: Props) {
  const scroller = useRef<HTMLDivElement>(null)

  // keep the highlighted branch in view as the user types
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const target = search.anchor ?? layout.nodes.find((v) => v.depth === 0)?.node ?? null
    const v = target ? layout.byId.get(target.id) : undefined
    if (!v) return
    const left = Math.max(0, v.x - el.clientWidth / 2)
    if (Math.abs(el.scrollLeft - left) > 24) el.scrollTo({ left, behavior: 'smooth' })
  }, [layout, search.anchor])

  const showLabels = layout.col >= 22
  const empty = layout.nodes.length <= 1

  return (
    <div
      ref={scroller}
      className="relative overflow-x-auto overflow-y-hidden rounded-2xl border border-linen-deep bg-parchment shadow-[inset_0_1px_0_#fff]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null)
      }}
    >
      {empty && (
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-serif text-2xl text-moss-deep">The grove is bare.</p>
            <p className="mt-1 text-sm text-ink-soft">
              Type a word and press Enter, or load the bundled list below.
            </p>
          </div>
        </div>
      )}
      <svg
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="block select-none"
        role="img"
        aria-label="Trie drawn as a plant growing from the soil"
        onClick={(e) => {
          if (e.target === e.currentTarget) onSelect(null)
        }}
      >
        <defs>
          <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a6650" />
            <stop offset="1" stopColor="#5b4634" />
          </linearGradient>
        </defs>
        {/* soil line */}
        <rect x={0} y={layout.height - SOIL} width={layout.width} height={SOIL} fill="url(#soil)" />
        <line
          x1={0}
          x2={layout.width}
          y1={layout.height - SOIL + 0.5}
          y2={layout.height - SOIL + 0.5}
          stroke="#c6d9b2"
          strokeWidth={1.5}
        />

        {layout.nodes.map((v) => {
          const st = stateOf(v, search)
          const selected = selectedId !== null && v.ids.includes(selectedId)
          const fresh = animate && v.node.id >= freshCursor
          const isRoot = v.depth === 0
          const labelVisible = !isRoot && (showLabels || st === 'lit' || selected || v.label.length > 1)
          const leafR = 4.2 + Math.min(4, Math.sqrt(v.node.count) * 0.9)
          return (
            <g
              key={v.key}
              className={`cursor-pointer transition-opacity duration-300 ${fresh ? 'sprout' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(selected ? null : v.node.id)
              }}
            >
              <title>
                {isRoot
                  ? `root · ${v.node.words} words`
                  : `${v.prefix}${v.terminal ? ` · word ×${v.node.count}` : ''} · ${v.node.words} in subtree`}
              </title>
              <path d={v.edge} className={`${EDGE_FILL[st]} transition-[fill,opacity] duration-300`} />
              {v.terminal ? (
                <ellipse
                  cx={v.x}
                  cy={v.y - 1}
                  rx={leafR * 1.35}
                  ry={leafR * 0.78}
                  transform={`rotate(${v.x < v.px ? -38 : 38} ${v.x} ${v.y - 1})`}
                  className={`${LEAF_FILL[st]} stroke-moss-deep/40 transition-[fill,opacity] duration-300`}
                  strokeWidth={0.8}
                />
              ) : (
                <circle
                  cx={v.x}
                  cy={v.y}
                  r={isRoot ? 3.4 : Math.max(1.8, v.width / 2 + 0.6)}
                  className={`${st === 'dim' ? 'fill-bark opacity-[0.16]' : st === 'lit' ? 'fill-chartreuse-deep' : 'fill-bark'} transition-[fill,opacity] duration-300`}
                />
              )}
              {selected && (
                <circle
                  cx={v.x}
                  cy={v.y}
                  r={leafR * 1.6 + 3}
                  className="fill-none stroke-clay"
                  strokeWidth={1.8}
                  strokeDasharray="3 2.5"
                />
              )}
              {labelVisible && (
                <text
                  x={v.terminal ? v.x : v.x + Math.max(4, v.width / 2 + 3)}
                  y={v.terminal ? v.y - leafR - 5 : v.y + 4}
                  textAnchor={v.terminal ? 'middle' : 'start'}
                  paintOrder="stroke"
                  stroke="#fbf8f2"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  className={`font-sans text-[10.5px] font-semibold ${
                    st === 'lit'
                      ? 'fill-moss-deep'
                      : st === 'dim'
                        ? 'fill-ink-soft opacity-30'
                        : st === 'pruned'
                          ? 'fill-clay'
                          : 'fill-ink-soft'
                  }`}
                >
                  {v.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export const Grove = memo(GroveInner)
