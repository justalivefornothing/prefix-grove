import { describe, expect, it } from 'vitest'
import { Trie } from './Trie'
import { fuzzySearch } from './fuzzy'

const seeded = () => {
  const t = new Trie()
  for (const w of ['car', 'cart', 'cat']) t.insert(w)
  return t
}

describe('Trie insert / lookup', () => {
  it('shares prefixes so car, cart, cat need five nodes', () => {
    const t = seeded()
    expect(t.nodeCount()).toBe(5)
    expect(t.wordCount()).toBe(3)
  })

  it('autocompletes alphabetically when frequencies tie', () => {
    const t = seeded()
    expect(t.autocomplete('ca')).toEqual(['car', 'cart', 'cat'])
  })

  it('returns nothing for a prefix that does not exist', () => {
    const t = seeded()
    expect(t.autocomplete('dog')).toEqual([])
    expect(t.find('dog')).toBeNull()
  })

  it('ranks by frequency before alphabet', () => {
    const f = new Trie()
    f.insert('the')
    f.insert('the')
    f.insert('the')
    f.insert('then')
    expect(f.autocomplete('th')).toEqual(['the', 'then'])
    expect(f.frequency('the')).toBe(3)
    expect(f.totalCount()).toBe(4)
  })

  it('tracks subtree word counts on every node', () => {
    const t = seeded()
    expect(t.find('ca')!.words).toBe(3)
    expect(t.find('car')!.words).toBe(2)
    expect(t.find('cart')!.words).toBe(1)
    expect(t.root.words).toBe(3)
  })
})

describe('Trie delete', () => {
  it('keeps shared nodes alive when deleting a prefix word', () => {
    const t = seeded()
    t.delete('car')
    expect(t.has('car')).toBe(false)
    expect(t.has('cart')).toBe(true)
    expect(t.nodeCount()).toBe(5)
  })

  it('prunes dangling nodes when deleting a leaf word', () => {
    const t = seeded()
    expect(t.delete('cart')).toBe(true)
    expect(t.nodeCount()).toBe(4)
    expect(t.find('ca')!.words).toBe(2)
    expect(t.delete('cart')).toBe(false)
  })

  it('reports raw character savings', () => {
    const t = seeded()
    expect(t.rawChars()).toBe(10)
    t.delete('cart')
    expect(t.rawChars()).toBe(6)
  })
})

describe('fuzzy search', () => {
  it('finds words within one edit', () => {
    const t = seeded()
    expect(t.fuzzy('cst', 1)).toEqual(['cat'])
  })

  it('widens with the budget and orders by distance', () => {
    const t = seeded()
    expect(t.fuzzy('cst', 2)).toEqual(['cat', 'car', 'cart'])
    expect(t.fuzzy('cat', 0)).toEqual(['cat'])
  })

  it('prunes subtrees whose whole DP row exceeds the budget', () => {
    const t = seeded()
    t.insert('dog')
    const r = fuzzySearch(t, 'cst', 1)
    // 'd' could still be a substitution for 'c', so it is explored; 'do' cannot recover.
    expect(r.visited.has(t.find('d')!.id)).toBe(true)
    expect(r.pruned.has(t.find('do')!.id)).toBe(true)
    expect(r.visited.has(t.find('dog')!.id)).toBe(false)
    expect(r.visited.has(t.find('ca')!.id)).toBe(true)
    expect(r.matches.map((m) => m.word)).toEqual(['cat'])
  })

  it('handles insertions and deletions, not just substitutions', () => {
    const t = new Trie()
    for (const w of ['plant', 'plan', 'plane']) t.insert(w)
    expect(t.fuzzy('plnt', 1)).toEqual(['plant'])
    expect(t.fuzzy('plnt', 2)).toEqual(['plant', 'plan', 'plane'])
    expect(t.fuzzy('planet', 1)).toEqual(['plane', 'plant'])
  })
})
