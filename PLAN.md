# Prefix Grove — Plan

## Goal

A trie that grows like a plant as you type. Every word inserted adds branches
to a tree drawn bottom-up from the soil line; typing a prefix dims the grove
and lights the matched path while ranked autocomplete chips sprout beside the
input. Fuzzy mode walks the tree with an edit-distance budget and shows which
branches were pruned.

## Features

1. Trie insert / delete / prefix lookup from scratch, per-node frequency counts
2. Live autocomplete ranked by frequency then alphabetically; matched path highlighted
3. Fuzzy mode: DFS carrying a Levenshtein DP row, budget 0-2, pruned branches shown
4. Load a bundled 2,000-word list or paste your own; new nodes animate in
5. Node inspector: prefix, child count, terminal flag, subtree word count
6. Compress toggle: collapse single-child chains into radix-style edges
7. Stats bar: node count, word count, memory saved vs raw strings

## Architecture

```
src/
  trie/
    Trie.ts          core data structure (Map children, count, terminal count)
    fuzzy.ts         DP-row fuzzy walk returning matches + pruned node ids
    layout.ts        tidy bottom-up layout (optionally compressed) -> positions
    Trie.test.ts     vitest specs from the brief + extras
  data/words.ts      bundled 2,000-word list
  components/
    Grove.tsx        SVG tree: tapered edges, leaf terminals, highlight states
    SearchBar.tsx    input, mode toggle, distance budget, chips
    Inspector.tsx    clicked-node details
    StatsBar.tsx     counts + memory saved
    WordLoader.tsx   bundled list / paste your own
  App.tsx            state wiring (useReducer over a Trie instance + version tick)
```

The trie is a mutable class; React re-renders on a version counter bump so
we avoid cloning thousands of nodes per keystroke. Layout is computed once per
version + compress flag and memoised.

## Milestones

- [ ] Plan, license, git init
- [ ] Scaffold vite react-ts + tailwind + vitest
- [ ] Trie core + fuzzy + tests green
- [ ] Layout + SVG grove rendering, highlight path, chips
- [ ] Fuzzy mode with pruned branches, inspector, compress toggle
- [ ] Word loader with grow-in animation, stats bar
- [ ] Build, smoke screenshot, polish
- [ ] README, publish private repo
