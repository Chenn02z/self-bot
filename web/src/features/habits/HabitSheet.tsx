import { useState } from 'react'
import { createHabit } from '../../lib/api'
import ColorPicker, { SWATCHES } from '../../ui/ColorPicker'
import Sheet, { SheetHeader } from '../../ui/Sheet'
import { field, tint } from '../../ui/styles'

// New habit. Editing arrives with #5.
export default function HabitSheet({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const [emoji, setEmoji] = useState('✅')
  const [name, setName] = useState('')
  const [color, setColor] = useState(SWATCHES[5])
  const [target, setTarget] = useState(1)
  const [error, setError] = useState('')

  async function save() {
    if (!name.trim()) return setError('Give the habit a name')
    try {
      await createHabit(userId, { emoji: emoji.trim() || '✅', name: name.trim(), color, target })
      onSaved()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const step = 'grid size-11 place-items-center rounded-full bg-paper text-xl font-semibold disabled:opacity-40'
  return (
    <Sheet onClose={onClose} label="New habit"
      header={
        <SheetHeader onClose={onClose} action={{ label: 'Add', onClick: save }}>
          <h3 className="font-round font-bold">New habit</h3>
        </SheetHeader>
      }>
      {error && <p className="mb-3 text-sm text-warn" role="alert">{error}</p>}
      <div className="mt-2 flex items-center gap-3">
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} aria-label="Emoji" style={{ background: tint(color) }}
          className="size-16 shrink-0 rounded-2xl text-center text-3xl outline-none focus-visible:outline-2" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" enterKeyHint="done"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
          autoFocus className={field} />
      </div>

      <div className="mt-6"><ColorPicker value={color} onChange={setColor} /></div>

      <div className="mt-6 flex items-center justify-between rounded-xl bg-paper/60 px-4 py-3">
        <span>
          <span className="block font-semibold">Daily target</span>
          <span className="block text-sm text-mute">{target === 1 ? 'Once a day' : `${target} times a day`}</span>
        </span>
        <span className="flex items-center gap-3">
          <button onClick={() => setTarget((t) => t - 1)} disabled={target <= 1} aria-label="Fewer" className={step}>−</button>
          <span className="w-8 text-center font-round text-2xl font-bold tabular-nums" aria-live="polite">{target}</span>
          <button onClick={() => setTarget((t) => t + 1)} aria-label="More" className={step}>+</button>
        </span>
      </div>
    </Sheet>
  )
}
