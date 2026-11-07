import { useMemo, useState } from 'react'
import { monthStart } from '../../lib/dates'
import { cash } from '../../lib/money'
import type { Category } from '../../lib/supabase'
import { useMonthTransactions } from '../../hooks/useMonthTransactions'
import { pageTitle, sectionTitle, surface } from '../../ui/styles'
import { onDay, spentIn, summarise } from '../spending/summary'

export type Screen = 'spending' | 'settings'

export default function HomePage({ cats, onOpen }: { cats: Category[]; onOpen: (s: Screen) => void }) {
  return (
    <div className="space-y-4 px-5 pt-6">
      <header className="flex items-center justify-between">
        <h1 className={pageTitle}>Home</h1>
        <button onClick={() => onOpen('settings')} aria-label="Settings"
          className="grid size-9 place-items-center rounded-full bg-card text-mute">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </button>
      </header>
      <SpendingCard cats={cats} onOpen={() => onOpen('spending')} />
    </div>
  )
}

// Same maths as the Spending screen for the current month, so the numbers always match.
function SpendingCard({ cats, onOpen }: { cats: Category[]; onOpen: () => void }) {
  const [now] = useState(() => new Date()) // Home remounts on every return, so this stays fresh
  const month = monthStart(now)
  const { txs } = useMonthTransactions(month)
  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats])
  const today = now.getDate()
  const { total } = summarise(txs, catById, today)
  const todaySpent = spentIn(onDay(txs, today), catById)

  return (
    <button onClick={onOpen} className={`${surface} block w-full px-5 py-4 text-left active:opacity-80`}>
      <span className="flex items-baseline justify-between">
        <span className={sectionTitle}>Spending</span>
        <span aria-hidden className="text-mute">›</span>
      </span>
      <span className="mt-2 block font-round text-3xl font-bold tabular-nums">{cash(total)}</span>
      <span className="block text-sm text-mute tabular-nums">this month · {cash(todaySpent)} today</span>
    </button>
  )
}
