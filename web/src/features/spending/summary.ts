// Pure month maths for the spending page. Kept free of React so it can be checked directly (summary.check.ts).
import { counts, signed } from '../../lib/money.ts'
import type { Category, Tx } from '../../lib/supabase.ts'

export type Slice = { id: string; total: number } // id '' = uncategorised

const catKey = (t: Tx) => t.category_id ?? ''

export function summarise(txs: Tx[], catById: Map<string, Category>, daysElapsed: number) {
  const counted = txs.filter((t) => counts(catById.get(catKey(t))))
  const byCat = new Map<string, number>()
  let total = 0
  for (const t of counted) {
    const v = signed(t)
    total += v
    byCat.set(catKey(t), (byCat.get(catKey(t)) ?? 0) + v)
  }
  const slices: Slice[] = [...byCat].filter(([, v]) => v > 0).map(([id, total]) => ({ id, total })).sort((a, b) => b.total - a.total)
  return { total, slices, dailyAvg: total / Math.max(1, daysElapsed) }
}

// Spending for a list of rows, ignoring income and transfers.
export const spentIn = (txs: Tx[], catById: Map<string, Category>) =>
  txs.filter((t) => counts(catById.get(catKey(t)))).reduce((s, t) => s + signed(t), 0)

export const onDay = (txs: Tx[], day: number) => txs.filter((t) => new Date(t.occurred_at).getDate() === day)
export const inCategory = (txs: Tx[], id: string) => txs.filter((t) => catKey(t) === id)

// Newest first in, newest day first out.
export function groupByDay(txs: Tx[]) {
  const groups = new Map<string, Tx[]>()
  for (const t of txs) {
    const k = new Date(t.occurred_at).toDateString()
    groups.set(k, [...(groups.get(k) ?? []), t])
  }
  return [...groups.values()]
}
