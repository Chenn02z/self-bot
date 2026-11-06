import { useState } from 'react'
import { deleteCategory, saveCategory } from '../../lib/api'
import type { Category, Kind } from '../../lib/supabase'
import Segmented from '../../ui/Segmented'
import Sheet, { SheetHeader } from '../../ui/Sheet'
import { field, primaryBtn, tint } from '../../ui/styles'
import { KIND_HINT, KINDS } from './kinds'

const SWATCHES = ['#FF9500', '#FF3B30', '#FF2D55', '#AF52DE', '#5856D6', '#007AFF',
  '#30B0C7', '#34C759', '#FFCC00', '#A2845E', '#8E8E93', '#636366']

// Add (cat = null) or edit a category.
export default function CategorySheet({ userId, cat, onClose, onSaved }: { userId: string; cat: Category | null; onClose: () => void; onSaved: () => void }) {
  const [emoji, setEmoji] = useState(cat?.emoji ?? '🏷️')
  const [name, setName] = useState(cat?.name ?? '')
  const [color, setColor] = useState(cat?.color ?? SWATCHES[5])
  const [kind, setKind] = useState<Kind>((cat?.kind as Kind) ?? 'expense')
  const [error, setError] = useState('')

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
    if (!name.trim()) return setError('Give the category a name')
    commit(() => saveCategory(userId, cat, { emoji: emoji.trim() || '🏷️', name: name.trim(), color, kind }))
  }
  function remove() {
    if (cat && confirm(`Delete “${cat.name}”? Its transactions become uncategorised.`)) commit(() => deleteCategory(cat.id))
  }

  return (
    <Sheet onClose={onClose} label={cat ? `Edit ${cat.name}` : 'New category'}>
      <SheetHeader onClose={onClose}>
        <h3 className="font-round font-bold">{cat ? 'Edit category' : 'New category'}</h3>
      </SheetHeader>

      <div className="mt-6 flex items-center gap-3">
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} aria-label="Emoji" style={{ background: tint(color) }}
          className="size-16 shrink-0 rounded-2xl text-center text-3xl outline-none focus-visible:outline-2" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name"
          autoFocus={!cat} className={field} />
      </div>

      <div className="mt-6 grid grid-cols-6 gap-3" role="radiogroup" aria-label="Colour">
        {SWATCHES.map((s) => (
          <button key={s} role="radio" aria-checked={color === s} aria-label={s} onClick={() => setColor(s)}
            className={`aspect-square rounded-full ${color === s ? 'ring-2 ring-ink ring-offset-2 ring-offset-card' : ''}`}
            style={{ background: s }} />
        ))}
      </div>

      <div className="mt-6">
        <Segmented value={kind} onChange={setKind} options={KINDS} />
        <p className="mt-2 px-1 text-sm text-mute">{KIND_HINT[kind]}</p>
      </div>

      {error && <p className="mt-4 text-sm text-warn" role="alert">{error}</p>}
      <button onClick={save} className={`mt-6 ${primaryBtn}`}>{cat ? 'Save changes' : 'Add category'}</button>
      {cat && <button onClick={remove} className="mt-2 w-full py-3 font-semibold text-warn">Delete category</button>}
    </Sheet>
  )
}
