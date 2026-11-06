import { counts, money } from '../../lib/money'
import { timeLabel } from '../../lib/dates'
import type { Category, Tx } from '../../lib/supabase'
import CategoryIcon from '../../ui/CategoryIcon'

export default function TransactionRow({ t, cat, onOpen }: { t: Tx; cat?: Category; onOpen: (t: Tx) => void }) {
  const amountTone = t.direction === 'in' ? 'text-gain' : counts(cat) ? '' : 'text-mute'
  return (
    <li>
      <button onClick={() => onOpen(t)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left">
        <CategoryIcon cat={cat} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{t.merchant}</span>
          <span className="block truncate text-sm text-mute">{cat?.name ?? 'Categorising…'}{t.note ? `, ${t.note}` : ''}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className={`block font-round font-semibold tabular-nums ${amountTone}`}>
            {t.direction === 'in' && '+'}{t.currency !== 'SGD' ? `${t.currency} ` : '$'}{money(Number(t.amount))}
          </span>
          <span className="block text-xs text-mute">{timeLabel(new Date(t.occurred_at))}</span>
        </span>
      </button>
    </li>
  )
}
