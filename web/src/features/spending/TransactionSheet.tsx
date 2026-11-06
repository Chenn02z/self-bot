import { useState } from 'react'
import { deleteTransaction, saveTransaction } from '../../lib/api'
import { toLocalInput } from '../../lib/dates'
import type { Category, Tx } from '../../lib/supabase'
import AmountInput from '../../ui/AmountInput'
import Segmented from '../../ui/Segmented'
import Sheet, { SheetHeader } from '../../ui/Sheet'
import { field, tint } from '../../ui/styles'

type Props = { userId: string; cats: Category[]; tx: Tx | null; onClose: () => void; onSaved: () => void }
const DIRECTIONS = [['out', 'Expense'], ['in', 'Money in']] as const

// Add (tx = null) or edit a transaction. Fields run most-used first: amount, merchant, category; date and note last.
export default function TransactionSheet({ userId, cats, tx, onClose, onSaved }: Props) {
  const [direction, setDirection] = useState<'out' | 'in'>(tx?.direction === 'in' ? 'in' : 'out')
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '')
  const [merchant, setMerchant] = useState(tx?.merchant ?? '')
  const [when, setWhen] = useState(() => toLocalInput(tx ? new Date(tx.occurred_at) : new Date()))
  const [categoryId, setCategoryId] = useState<string | null>(tx?.category_id ?? null)
  const [note, setNote] = useState(tx?.note ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Runs a write, then closes; on failure stays open and shows why.
  const commit = async (write: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await write()
      onSaved()
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
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

  const submitOnEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); save() } }

  return (
    <Sheet onClose={onClose} label={tx ? 'Edit transaction' : 'Add transaction'}
      header={
        <SheetHeader onClose={onClose} action={{ label: tx ? 'Save' : 'Add', onClick: save, disabled: busy }}>
          <Segmented value={direction} onChange={setDirection} options={DIRECTIONS} />
        </SheetHeader>
      }>
      <div className="pt-4">
        <AmountInput value={amount} onChange={setAmount} autoFocus={!tx}
          currency={tx && tx.currency !== 'SGD' ? tx.currency : '$'} />
      </div>
      {error && <p className="mt-3 text-center text-sm text-warn" role="alert">{error}</p>}

      <input className={`${field} mt-6`} placeholder="Merchant" aria-label="Merchant"
        autoCapitalize="words" autoComplete="off" enterKeyHint={tx ? 'done' : 'go'}
        value={merchant} onChange={(e) => setMerchant(e.target.value)} onKeyDown={submitOnEnter} />
      {tx && tx.merchant_raw !== tx.merchant && <p className="mt-1 px-1 text-xs text-mute">From the bank as “{tx.merchant_raw}”</p>}

      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Category">
        {!tx && <Chip active={categoryId === null} onClick={() => setCategoryId(null)}>✨ Let AI pick</Chip>}
        {cats.map((c) => (
          <Chip key={c.id} active={categoryId === c.id} color={c.color} onClick={() => setCategoryId(c.id)}>
            {c.emoji} {c.name}
          </Chip>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        <input className={field} type="datetime-local" aria-label="Date and time"
          value={when} onChange={(e) => setWhen(e.target.value)} />
        <input className={field} placeholder="Note (optional)" aria-label="Note" enterKeyHint="done"
          value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={submitOnEnter} />
      </div>

      {tx && (
        <div className="mt-6 flex items-center justify-between px-1 text-sm">
          <span className="text-mute">{tx.source}{tx.category_source === 'ai' ? ', categorised by AI' : ''}</span>
          <button onClick={remove} disabled={busy} className="font-semibold text-warn">Delete</button>
        </div>
      )}
    </Sheet>
  )
}

function Chip({ active, color, onClick, children }: { active: boolean; color?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={active} onClick={onClick} style={{ background: tint(color) }}
      className={`rounded-full px-3 py-1.5 text-sm font-medium ${active ? 'ring-2 ring-ink' : ''}`}>{children}</button>
  )
}
