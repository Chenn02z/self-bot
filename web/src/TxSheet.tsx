import { useState } from 'react'
import { supabase, type Category, type Tx } from './supabase'

type Props = { userId: string; cats: Category[]; tx: Tx | null; onClose: () => void; onSaved: () => void }

// Add (tx = null) or edit a transaction.
export default function TxSheet({ userId, cats, tx, onClose, onSaved }: Props) {
  const [direction, setDirection] = useState(tx?.direction ?? 'out')
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '')
  const [merchant, setMerchant] = useState(tx?.merchant ?? '')
  const [when, setWhen] = useState(toLocalInput(tx ? new Date(tx.occurred_at) : new Date()))
  const [categoryId, setCategoryId] = useState<string | null>(tx?.category_id ?? null)
  const [note, setNote] = useState(tx?.note ?? '')
  const [error, setError] = useState('')

  async function save() {
    const amt = Number(amount)
    if (!(amt > 0) || !merchant.trim()) return setError('Amount and merchant are required')
    const fields = {
      direction, amount: amt, merchant: merchant.trim(), occurred_at: new Date(when).toISOString(),
      category_id: categoryId, note: note.trim() || null,
    }
    const { error } = tx
      ? await supabase.from('transactions').update({
          ...fields,
          // a category the user picks is never overwritten by the classifier
          ...(categoryId !== tx.category_id ? { category_source: categoryId ? 'user' : null } : {}),
        }).eq('id', tx.id)
      : await supabase.from('transactions').insert({
          ...fields, user_id: userId, merchant_raw: fields.merchant, source: 'Manual',
          category_source: categoryId ? 'user' : null, // null category -> AI classifies it
        })
    if (error) return setError(error.message)
    onSaved()
    onClose()
  }

  async function remove() {
    if (!tx || !confirm('Delete this transaction?')) return
    const { error } = await supabase.from('transactions').update({ is_deleted: true }).eq('id', tx.id)
    if (error) return setError(error.message)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-10 flex items-end bg-black/30" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white px-5 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full bg-gray-100 text-gray-500" aria-label="Close">✕</button>
          <div className="flex rounded-lg bg-gray-100 p-1 text-sm font-semibold">
            {(['out', 'in'] as const).map((d) => (
              <button key={d} onClick={() => setDirection(d)}
                className={`rounded-md px-4 py-1 ${direction === d ? 'bg-white shadow-sm' : 'text-gray-400'}`}>
                {d === 'out' ? 'Expense' : 'Money in'}
              </button>
            ))}
          </div>
          <span className="size-8" />
        </div>

        <label className="mt-6 flex items-baseline justify-center gap-1">
          <span className="text-2xl text-gray-400">{tx && tx.currency !== 'SGD' ? tx.currency : '$'}</span>
          <input inputMode="decimal" placeholder="0.00" value={amount} autoFocus={!tx}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            style={{ width: `${Math.max(amount.length, 4) + 0.5}ch` }}
            className="bg-transparent text-5xl! font-bold outline-none" />
        </label>

        <div className="mt-6 space-y-3">
          <input className="w-full rounded-xl bg-gray-100 px-4 py-3" placeholder="Merchant"
            value={merchant} onChange={(e) => setMerchant(e.target.value)} />
          {tx && tx.merchant_raw !== tx.merchant && <p className="px-1 text-xs text-gray-400">Bank: {tx.merchant_raw}</p>}
          <input className="w-full rounded-xl bg-gray-100 px-4 py-3" type="datetime-local"
            value={when} onChange={(e) => setWhen(e.target.value)} />
          <input className="w-full rounded-xl bg-gray-100 px-4 py-3" placeholder="Note"
            value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!tx && <Chip active={categoryId === null} onClick={() => setCategoryId(null)}>✨ Auto</Chip>}
          {cats.map((c) => (
            <Chip key={c.id} active={categoryId === c.id} color={c.color} onClick={() => setCategoryId(c.id)}>
              {c.emoji} {c.name}
            </Chip>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        <button onClick={save} className="mt-6 w-full rounded-xl bg-neutral-800 py-3 font-semibold text-white">Save</button>
        {tx && <button onClick={remove} className="mt-2 w-full py-3 font-medium text-red-500">Delete</button>}
        {tx && <p className="text-center text-xs text-gray-300">{tx.source}{tx.category_source === 'ai' ? ' · categorised by AI' : ''}</p>}
      </div>
    </div>
  )
}

function Chip({ active, color, onClick, children }: { active: boolean; color?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${active ? 'ring-2 ring-neutral-800' : ''}`}
      style={{ background: (color ?? '#8E8E93') + '26' }}>{children}</button>
  )
}

function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
