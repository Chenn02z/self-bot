import { useCallback, useEffect, useMemo, useState } from 'react'
import TxSheet from './TxSheet'
import { counts, money, signed, supabase, type Category, type Tx } from './supabase'

type Props = { userId: string; cats: Category[]; adding: boolean; onAddClose: () => void }

export default function Home({ userId, cats, adding, onAddClose }: Props) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [txs, setTxs] = useState<Tx[]>([])
  const [editing, setEditing] = useState<Tx | null>(null)
  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats])

  const load = useCallback(async () => {
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 1)
    const { data } = await supabase.from('transactions').select('*')
      .eq('is_deleted', false)
      .gte('occurred_at', month.toISOString()).lt('occurred_at', end.toISOString())
      .order('occurred_at', { ascending: false })
    setTxs(data ?? [])
  }, [month])

  useEffect(() => {
    load()
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const afterSave = () => {
    load()
    setTimeout(load, 4000) // AI category arrives a few seconds after insert
  }

  const counted = txs.filter((t) => counts(catById.get(t.category_id ?? '')))
  const total = counted.reduce((s, t) => s + signed(t), 0)

  const byCat = new Map<string, number>()
  for (const t of counted) byCat.set(t.category_id ?? '', (byCat.get(t.category_id ?? '') ?? 0) + signed(t))
  const slices = [...byCat].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const sliceTotal = slices.reduce((s, [, v]) => s + v, 0)

  const days = new Map<string, Tx[]>()
  for (const t of txs) {
    const k = new Date(t.occurred_at).toDateString()
    days.set(k, [...(days.get(k) ?? []), t])
  }

  const now = new Date()
  const isCurrent = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth()
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))

  return (
    <div className="px-5">
      <header className="flex items-center justify-between pt-6">
        <h1 className="text-2xl font-bold">Spending</h1>
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 px-1 py-1 text-sm font-medium">
          <button className="px-2" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
          <span className="w-20 text-center">{month.toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })}</span>
          <button className="px-2 disabled:opacity-30" onClick={() => shift(1)} disabled={isCurrent} aria-label="Next month">›</button>
        </div>
      </header>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-gray-400">{isCurrent ? 'Spent this month' : 'Spent'}</p>
      <p className="text-5xl font-bold tracking-tight"><span className="align-top text-2xl text-gray-400">$</span>{money(total)}</p>

      {slices.length > 0 && (
        <div className="mt-6">
          <div className="flex h-8 gap-1 overflow-hidden rounded-lg">
            {slices.map(([id, v]) => (
              <div key={id} style={{ width: `${(v / sliceTotal) * 100}%`, background: catById.get(id)?.color ?? '#C7C7CC' }} />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {slices.map(([id, v]) => {
              const c = catById.get(id)
              return (
                <li key={id} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: c?.color ?? '#C7C7CC' }} />
                  {c?.name ?? 'Uncategorised'}
                  <span className="text-gray-400">${money(v)} · {Math.round((v / sliceTotal) * 100)}%</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {[...days].map(([day, list]) => {
          const dayTotal = list.filter((t) => counts(catById.get(t.category_id ?? ''))).reduce((s, t) => s + signed(t), 0)
          return (
            <section key={day}>
              <div className="flex justify-between border-b border-gray-100 pb-1 text-xs font-semibold uppercase text-gray-400">
                <span>{dayLabel(new Date(list[0].occurred_at))}</span>
                <span>{dayTotal < 0 ? "+" : "-"}${money(Math.abs(dayTotal))}</span>
              </div>
              <ul>
                {list.map((t) => <Row key={t.id} t={t} cat={catById.get(t.category_id ?? '')} onClick={() => setEditing(t)} />)}
              </ul>
            </section>
          )
        })}
        {txs.length === 0 && <p className="py-12 text-center text-gray-400">No transactions</p>}
      </div>

      {(adding || editing) && (
        <TxSheet
          userId={userId}
          cats={cats}
          tx={editing}
          onClose={() => { setEditing(null); onAddClose() }}
          onSaved={afterSave}
        />
      )}
    </div>
  )
}

function Row({ t, cat, onClick }: { t: Tx; cat?: Category; onClick: () => void }) {
  const muted = !counts(cat)
  return (
    <li>
      <button onClick={onClick} className="flex w-full items-center gap-3 py-2.5 text-left">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl text-lg"
          style={{ background: (cat?.color ?? '#C7C7CC') + '33' }}>{cat?.emoji ?? '❔'}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{t.merchant}</span>
          <span className="block truncate text-xs text-gray-400">
            {new Date(t.occurred_at).toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' })}
            {' · '}{cat?.name ?? 'Categorising…'}{t.note ? ` · ${t.note}` : ''}
          </span>
        </span>
        <span className={`shrink-0 font-semibold tabular-nums ${muted ? 'text-gray-300' : t.direction === 'in' ? 'text-green-600' : ''}`}>
          {t.direction === 'in' ? '+' : '-'}{t.currency !== 'SGD' ? `${t.currency} ` : '$'}{money(Number(t.amount))}
        </span>
      </button>
    </li>
  )
}

function dayLabel(d: Date) {
  const today = new Date()
  const yest = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
}
