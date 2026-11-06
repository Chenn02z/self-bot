import type { Category, Tx } from './supabase'

// Mirrors the public.spend_rows view: expense-kind or uncategorised rows count; out adds, in subtracts.
export const counts = (cat?: Category) => !cat || cat.kind === 'expense'
export const signed = (t: Tx) => (t.direction === 'out' ? 1 : -1) * Number(t.amount)

export const money = (n: number) =>
  n.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// "$12.30", or "−$5.00" when refunds outweigh spending
export const cash = (n: number) => `${n < 0 ? '−' : ''}$${money(Math.abs(n))}`

// Fits a calendar cell: "39", "1.2k", "<1"
export const compact = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n < 1 ? '<1' : String(Math.round(n))
