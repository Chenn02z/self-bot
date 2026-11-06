import { useMemo, useRef, useState } from 'react'
import { addMonths, dayLabel, daysInMonth, monthStart, sameMonth } from '../../lib/dates'
import type { Category, Tx } from '../../lib/supabase'
import { useMonthTransactions } from '../../hooks/useMonthTransactions'
import CategoryBreakdown from './CategoryBreakdown'
import MonthGrid from './MonthGrid'
import MonthHeader from './MonthHeader'
import MonthTotal from './MonthTotal'
import { applyFilter, sameFilter, summarise, type Filter } from './summary'
import TransactionList from './TransactionList'
import TransactionSheet from './TransactionSheet'

const RECENT = 12

type Props = { userId: string; cats: Category[]; adding: boolean; onAddClose: () => void }

export default function SpendingPage({ userId, cats, adding, onAddClose }: Props) {
  const [month, setMonth] = useState(() => monthStart(new Date()))
  const [filter, setFilter] = useState<Filter>(null)
  const [showAll, setShowAll] = useState(false)
  const [editing, setEditing] = useState<Tx | null>(null)
  const listRef = useRef<HTMLElement>(null)
  const { txs, reload } = useMonthTransactions(month)
  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats])

  const now = new Date()
  const ongoing = sameMonth(month, now)
  const { total, perDay, slices, dailyAvg } = summarise(txs, catById, ongoing ? now.getDate() : daysInMonth(month))

  const matching = applyFilter(txs, filter)
  const shown = filter || showAll ? matching : matching.slice(0, RECENT)
  const title = !filter ? 'Recent'
    : 'day' in filter ? dayLabel(new Date(month.getFullYear(), month.getMonth(), filter.day))
    : catById.get(filter.cat)?.name ?? 'Uncategorised'

  const shift = (n: number) => {
    setMonth(addMonths(month, n))
    setFilter(null)
    setShowAll(false)
  }
  const pick = (f: NonNullable<Filter>) => {
    const toggledOff = sameFilter(f, filter)
    setFilter(toggledOff ? null : f)
    // the list sits below the calendar and breakdown; bring the filtered rows into view
    if (!toggledOff) {
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
      <MonthHeader month={month} canGoForward={!ongoing} onShift={shift} />
      <MonthTotal total={total} dailyAvg={dailyAvg} ongoing={ongoing} />
      <MonthGrid month={month} perDay={perDay} today={ongoing ? now.getDate() : null}
        selected={filter && 'day' in filter ? filter.day : null} onPick={(day) => pick({ day })} />
      <CategoryBreakdown slices={slices} catById={catById}
        selected={filter && 'cat' in filter ? filter.cat : null} onPick={(cat) => pick({ cat })} />
      <TransactionList ref={listRef} title={title} txs={shown} catById={catById}
        showDayHeaders={!(filter && 'day' in filter)}
        emptyText={filter ? `Nothing for ${title}.` : `Nothing recorded in ${month.toLocaleDateString('en-SG', { month: 'long' })}. Tap + to add a transaction.`}
        hiddenCount={matching.length - shown.length}
        onClear={filter ? () => setFilter(null) : undefined}
        onShowAll={() => setShowAll(true)} onOpen={setEditing} />

      {(adding || editing) && (
        <TransactionSheet userId={userId} cats={cats} tx={editing}
          onClose={() => { setEditing(null); onAddClose() }} onSaved={afterSave} />
      )}
    </div>
  )
}
