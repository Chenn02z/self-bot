import type { Kind } from '../../lib/supabase'

export const KINDS = [['expense', 'Spending'], ['income', 'Income'], ['transfer', 'Transfer']] as const satisfies readonly (readonly [Kind, string])[]
export const kindLabel = (k: string) => KINDS.find(([v]) => v === k)?.[1] ?? k
export const KIND_HINT: Record<Kind, string> = {
  expense: 'Counts toward your monthly total.',
  income: 'Shown in your list, not counted as spending.',
  transfer: 'Money moved between your own accounts. Shown, not counted.',
}
