import { useState } from 'react'
import { deleteTransaction, saveTransaction } from '../../lib/api'
import { toLocalInput } from '../../lib/dates'
import type { Category, Tx } from '../../lib/supabase'
import AmountInput from '../../ui/AmountInput'
import Segmented from '../../ui/Segmented'
import Sheet, { SheetHeader } from '../../ui/Sheet'
import { field, primaryBtn, tint } from '../../ui/styles'

type Props = { userId: string; cats: Category[]; tx: Tx | null; onClose: () => void; onSaved: () => void }
const DIRECTIONS = [['out', 'Expense'], ['in', 'Money in']] as const

// Add (tx = null) or edit a transaction.
export default function TransactionSheet({ userId, cats, tx, onClose, onSaved }: Props) {
  const [direction, setDirection] = useState<'out' | 'in'>(tx?.direction === 'in' ? 'in' : 'out')
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '')
  const [merchant, setMerchant] = useState(tx?.merchant ?? '')
  const [when, setWhen] = useState(() => toLocalInput(tx ? new Date(tx.occurred_at) : new Date()))
  const [categoryId, setCategoryId] = useState<string | null>(tx?.category_id ?? null)
  const [note, setNote] = useState(tx?.note ?? '')
  const [error, setError] = useState('')

  // Runs a write, then closes; on failure stays open and shows why.
  const commit = async (write: () => Promise<unknown>) => {
    try {
      await write()
      onSaved()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function save() {
    const amt = Number(amount)
    if (!(amt > 0)) return setError('Enter an amount above zero')
    if (!merchant.trim()) return setError('Enter where the money went')
    commit(() => saveTransaction(userId, tx, {
      direction, amount: amt, merchant: merchant.trim(), occurred_at: new Date(when).toISOString(),
      category_id: categoryId, note: note.trim() || null,
    }))
  }

  function remove() {
    if (tx && confirm('Delete this transaction?')) commit(() => deleteTransaction(tx.id))
  }

  return (
    <Sheet onClose={onClose} label={tx ? 'Edit transaction' : 'Add transaction'}>
      <SheetHeader onClose={onClose}>
        <Segmented value={direction} onChange={setDirection} options={DIRECTIONS} />
      </SheetHeader>

      <div className="mt-8">
        <AmountInput value={amount} onChange={setAmount} autoFocus={!tx}
          currency={tx && tx.currency !== 'SGD' ? tx.currency : '$'} />
      </div>

      <div className="mt-8 space-y-2">
        <input className={field} placeholder="Merchant" aria-label="Merchant"
          value={merchant} onChange={(e) => setMerchant(e.target.value)} />
        {tx && tx.merchant_raw !== tx.merchant && <p className="px-1 text-xs text-mute">From the bank as “{tx.merchant_raw}”</p>}
        <input className={field} type="datetime-local" aria-label="Date and time"
          value={when} onChange={(e) => setWhen(e.target.value)} />
        <input className={field} placeholder="Note (optional)" aria-label="Note"
          value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {!tx && <Chip active={categoryId === null} onClick={() => setCategoryId(null)}>✨ Let AI pick</Chip>}
        {cats.map((c) => (
          <Chip key={c.id} active={categoryId === c.id} color={c.color} onClick={() => setCategoryId(c.id)}>
            {c.emoji} {c.name}
          </Chip>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-warn" role="alert">{error}</p>}
      <button onClick={save} className={`mt-6 ${primaryBtn}`}>{tx ? 'Save changes' : 'Add transaction'}</button>
      {tx && (
        <div className="mt-3 flex items-center justify-between px-1 text-sm">
          <span className="text-mute">{tx.source}{tx.category_source === 'ai' ? ', categorised by AI' : ''}</span>
          <button onClick={remove} className="font-semibold text-warn">Delete</button>
        </div>
      )}
    </Sheet>
  )
}

function Chip({ active, color, onClick, children }: { active: boolean; color?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active} style={{ background: tint(color) }}
      className={`rounded-full px-3 py-1.5 text-sm font-medium ${active ? 'ring-2 ring-ink' : ''}`}>{children}</button>
  )
}
