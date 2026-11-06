// Run: node src/features/spending/summary.check.ts
/// <reference types="node" />
import assert from 'node:assert/strict'
import type { Category, Tx } from '../../lib/supabase.ts'
import { applyFilter, groupByDay, summarise } from './summary.ts'

const cat = (id: string, kind: string) => ({ id, kind }) as Category
const cats = new Map([['food', cat('food', 'expense')], ['xfer', cat('xfer', 'transfer')]])
const tx = (id: string, day: number, amount: number, category_id: string | null, direction = 'out') =>
  ({ id, occurred_at: new Date(2026, 10, day, 12).toISOString(), amount, category_id, direction }) as Tx

const txs = [
  tx('a', 3, 10, 'food'),
  tx('b', 3, 500, 'xfer'),           // transfers never count
  tx('c', 2, 4, 'food', 'in'),       // refund subtracts
  tx('d', 1, 6, null),               // uncategorised counts
]
const s = summarise(txs, cats, 3)
assert.equal(s.total, 12)
assert.equal(s.perDay.get(3), 10)
assert.equal(s.perDay.get(2), -4)
assert.equal(s.dailyAvg, 4)
assert.deepEqual(s.slices, [{ id: 'food', total: 6 }, { id: '', total: 6 }])
assert.deepEqual(applyFilter(txs, { day: 3 }).map((t) => t.id), ['a', 'b'])
assert.deepEqual(applyFilter(txs, { cat: '' }).map((t) => t.id), ['d'])
assert.deepEqual(groupByDay(txs).map((g) => g.length), [2, 1, 1])
console.log('summary ok')
