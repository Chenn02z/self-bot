// Pure month maths for the spending page. Kept free of React so it can be checked directly (summary.check.ts).
import { counts, signed } from '../../lib/money.ts'
import type { Category, Tx } from '../../lib/supabase.ts'

export type Filter = { day: number } | { cat: string } | null
export type Slice = { id: string; total: number } // id '' = uncategorised

const catKey = (t: Tx) => t.category_id ?? ''

export function summarise(txs: Tx[], catById: Map<string, Category>, daysElapsed: number) {
  const counted = txs.filter((t) => counts(catById.get(catKey(t))))
  const perDay = new Map<number, number>()
  const byCat = new Map<string, number>()
  let total = 0
  for (const t of counted) {
    const v = signed(t)
    const d = new Date(t.occurred_at).getDate()
    total += v
    perDay.set(d, (perDay.get(d) ?? 0) + v)
    byCat.set(catKey(t), (byCat.get(catKey(t)) ?? 0) + v)
  }
  const slices: Slice[] = [...byCat].filter(([, v]) => v > 0).map(([id, total]) => ({ id, total })).sort((a, b) => b.total - a.total)
  return { total, perDay, slices, dailyAvg: total / Math.max(1, daysElapsed) }
}

// Spending for a list of rows, ignoring income and transfers.
export const spentIn = (txs: Tx[], catById: Map<string, Category>) =>
  txs.filter((t) => counts(catById.get(catKey(t)))).reduce((s, t) => s + signed(t), 0)

export function applyFilter(txs: Tx[], f: Filter) {
  if (!f) return txs
  return 'day' in f ? txs.filter((t) => new Date(t.occurred_at).getDate() === f.day) : txs.filter((t) => catKey(t) === f.cat)
}

export const sameFilter = (a: Filter, b: Filter) => JSON.stringify(a) === JSON.stringify(b)

// Newest first in, newest day first out.
export function groupByDay(txs: Tx[]) {
  const groups = new Map<string, Tx[]>()
  for (const t of txs) {
    const k = new Date(t.occurred_at).toDateString()
    groups.set(k, [...(groups.get(k) ?? []), t])
  }
  return [...groups.values()]
}
