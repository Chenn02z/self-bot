import { cash } from '../../lib/money'
import { dayLabel } from '../../lib/dates'
import type { Category, Tx } from '../../lib/supabase'
import { surface } from '../../ui/styles'
import { groupByDay, spentIn } from './summary'
import TransactionRow from './TransactionRow'

type Props = {
  txs: Tx[]
  catById: Map<string, Category>
  showDayHeaders: boolean // off when the list is already a single day
  emptyText: string
  onOpen: (t: Tx) => void
}

export default function TransactionList({ txs, catById, showDayHeaders, emptyText, onOpen }: Props) {
  if (txs.length === 0) return <p className={`${surface} mt-3 px-4 py-8 text-center text-mute`}>{emptyText}</p>
  return (
    <div className={`${surface} mt-3 py-1`}>
      {groupByDay(txs).map((day) => {
        const spent = spentIn(day, catById)
        return (
          <div key={day[0].id}>
            {showDayHeaders && (
              <div className="flex justify-between px-4 pt-3 text-sm text-mute">
                <span>{dayLabel(new Date(day[0].occurred_at))}</span>
                {spent !== 0 && <span className="tabular-nums">{cash(spent)}</span>}
              </div>
            )}
            <ul>{day.map((t) => <TransactionRow key={t.id} t={t} cat={catById.get(t.category_id ?? '')} onOpen={onOpen} />)}</ul>
          </div>
        )
      })}
    </div>
  )
}
