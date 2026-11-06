import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Both values are public by design; RLS protects the data.
export const supabase = createClient<Database>(
  'https://bfpeqizfymrmsoxjbmhp.supabase.co',
  'sb_publishable_mfloIXxPU2pDFhPKiomiJQ_DOYrZl4y',
)

export type Tx = Database['public']['Tables']['transactions']['Row']
export type Category = Database['public']['Tables']['categories']['Row']

// Mirrors the public.spend_rows view: expense-kind or uncategorised rows count; out adds, in subtracts.
export const counts = (cat?: Category) => !cat || cat.kind === 'expense'
export const signed = (t: Tx) => (t.direction === 'out' ? 1 : -1) * Number(t.amount)

export const money = (n: number) =>
  n.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
