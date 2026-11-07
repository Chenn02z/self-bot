import { useState } from 'react'
import { deleteCategory, saveCategory } from '../../lib/api'
import type { Category, Kind } from '../../lib/supabase'
import ColorPicker, { SWATCHES } from '../../ui/ColorPicker'
import Segmented from '../../ui/Segmented'
import Sheet, { SheetHeader } from '../../ui/Sheet'
import { field, tint } from '../../ui/styles'
import { KIND_HINT, KINDS } from './kinds'

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
    <Sheet onClose={onClose} label={cat ? `Edit ${cat.name}` : 'New category'}
      header={
        <SheetHeader onClose={onClose} action={{ label: cat ? 'Save' : 'Add', onClick: save }}>
          <h3 className="font-round font-bold">{cat ? 'Edit category' : 'New category'}</h3>
        </SheetHeader>
      }>
      {error && <p className="mb-3 text-sm text-warn" role="alert">{error}</p>}
      <div className="mt-2 flex items-center gap-3">
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} aria-label="Emoji" style={{ background: tint(color) }}
          className="size-16 shrink-0 rounded-2xl text-center text-3xl outline-none focus-visible:outline-2" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" enterKeyHint="done"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
          autoFocus={!cat} className={field} />
      </div>

      <div className="mt-6"><ColorPicker value={color} onChange={setColor} /></div>

      <div className="mt-6">
        <Segmented value={kind} onChange={setKind} options={KINDS} />
        <p className="mt-2 px-1 text-sm text-mute">{KIND_HINT[kind]}</p>
      </div>

      {cat && <button onClick={remove} className="mt-8 w-full py-3 font-semibold text-warn">Delete category</button>}
    </Sheet>
  )
}
