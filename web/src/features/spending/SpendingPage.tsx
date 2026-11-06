import { useMemo, useRef, useState } from 'react'
import { addMonths, daysInMonth, monthStart, sameMonth } from '../../lib/dates'
import type { Category, Tx } from '../../lib/supabase'
import { useMonthTransactions } from '../../hooks/useMonthTransactions'
import { sectionTitle } from '../../ui/styles'
import CategoryBreakdown from './CategoryBreakdown'
import DayStepper from './DayStepper'
import MonthHeader from './MonthHeader'
import MonthTotal from './MonthTotal'
import { inCategory, onDay, spentIn, summarise } from './summary'
import TransactionList from './TransactionList'
import TransactionSheet from './TransactionSheet'

type Props = { userId: string; cats: Category[]; adding: boolean; onAddClose: () => void }

export default function SpendingPage({ userId, cats, adding, onAddClose }: Props) {
  const [month, setMonth] = useState(() => monthStart(new Date()))
  const [day, setDay] = useState(() => new Date().getDate())
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const [editing, setEditing] = useState<Tx | null>(null)
  const listRef = useRef<HTMLElement>(null)
  const { txs, reload } = useMonthTransactions(month)
  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats])

  const now = new Date()
  const ongoing = sameMonth(month, now)
  const { total, slices, dailyAvg } = summarise(txs, catById, ongoing ? now.getDate() : daysInMonth(month))
  const date = new Date(month.getFullYear(), month.getMonth(), day)
  const dayTxs = onDay(txs, day)

  const goTo = (d: Date) => {
    if (!sameMonth(d, month)) setMonth(monthStart(d))
    setDay(d.getDate())
  }
  // Date rolls over, so stepping back from the 1st lands on last month's final day
  const stepDay = (n: number) => goTo(new Date(month.getFullYear(), month.getMonth(), day + n))
  // A new month opens on today if it's the current one, else its last day
  const shiftMonth = (n: number) => {
    const m = addMonths(month, n)
    goTo(sameMonth(m, now) ? now : new Date(m.getFullYear(), m.getMonth() + 1, 0))
  }
  const pickCategory = (id: string) => {
    const off = catFilter === id
    setCatFilter(off ? null : id)
    if (!off) {
      const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
      requestAnimationFrame(() => listRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }))
    }
  }
  const afterSave = () => {
    reload()
    setTimeout(reload, 4000) // AI category arrives a few seconds after insert
  }

  return (
    <div className="px-5">
      <MonthHeader month={month} canGoForward={!ongoing} onShift={shiftMonth} />
      <MonthTotal total={total} dailyAvg={dailyAvg} ongoing={ongoing} />
      <CategoryBreakdown slices={slices} catById={catById} selected={catFilter} onPick={pickCategory} />

      <section ref={listRef} className="mt-8 scroll-mt-4">
        {catFilter === null ? (
          <>
            <DayStepper date={date} spent={spentIn(dayTxs, catById)}
              canForward={!(ongoing && day >= now.getDate())} onStep={stepDay} />
            <TransactionList txs={dayTxs} catById={catById} showDayHeaders={false}
              emptyText="No transactions this day." onOpen={setEditing} />
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <h2 className={sectionTitle}>{catById.get(catFilter)?.name ?? 'Uncategorised'}</h2>
              <button onClick={() => setCatFilter(null)} className="text-sm font-semibold text-mute">Back to days</button>
            </div>
            <TransactionList txs={inCategory(txs, catFilter)} catById={catById} showDayHeaders
              emptyText="Nothing in this category this month." onOpen={setEditing} />
          </>
        )}
      </section>

      {(adding || editing) && (
        <TransactionSheet userId={userId} cats={cats} tx={editing}
          onClose={() => { setEditing(null); onAddClose() }} onSaved={afterSave} />
      )}
    </div>
  )
}
