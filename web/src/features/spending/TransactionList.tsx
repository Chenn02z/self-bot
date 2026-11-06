import { cash } from '../../lib/money'
import { dayLabel } from '../../lib/dates'
import type { Category, Tx } from '../../lib/supabase'
import { sectionTitle, surface } from '../../ui/styles'
import { groupByDay, spentIn } from './summary'
import TransactionRow from './TransactionRow'

type Props = {
  title: string
  txs: Tx[]
  catById: Map<string, Category>
  showDayHeaders: boolean
  emptyText: string
  hiddenCount: number // rows left out of a "Recent" view
  onClear?: () => void
  onShowAll: () => void
  onOpen: (t: Tx) => void
  ref?: React.Ref<HTMLElement>
}

export default function TransactionList(
  { title, txs, catById, showDayHeaders, emptyText, hiddenCount, onClear, onShowAll, onOpen, ref }: Props,
) {
  return (
    <section ref={ref} className="mt-8 scroll-mt-4">
      <div className="flex items-baseline justify-between">
        <h2 className={sectionTitle}>{title}</h2>
        {onClear && <button onClick={onClear} className="text-sm font-semibold text-mute">Clear filter</button>}
      </div>

      {txs.length === 0 ? (
        <p className={`${surface} mt-2 px-4 py-8 text-center text-mute`}>{emptyText}</p>
      ) : (
        <div className={`${surface} mt-2 py-1`}>
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
      )}

      {hiddenCount > 0 && (
        <button onClick={onShowAll} className={`${surface} mt-3 w-full py-3 text-sm font-semibold`}>
          Show all {txs.length + hiddenCount} transactions
        </button>
      )}
    </section>
  )
}
