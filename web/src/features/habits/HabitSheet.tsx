import { useState } from 'react'
import { saveHabit, setArchived } from '../../lib/api'
import { PUBLISHABLE_KEY, SUPABASE_URL, type Habit } from '../../lib/supabase'
import ColorPicker, { SWATCHES } from '../../ui/ColorPicker'
import Sheet, { SheetHeader } from '../../ui/Sheet'
import { field, tint } from '../../ui/styles'

// Everything needed to build the iOS Shortcut except the habit key, which the user pastes in.
const shortcutDetails = (h: Habit) => `Shortcut for ${h.emoji} ${h.name}

URL: ${SUPABASE_URL}/rest/v1/rpc/habit_check_in
apikey: ${PUBLISHABLE_KEY}
p_habit_id: ${h.id}

1. Get Contents of URL → the URL above
   Method: POST
   Headers: apikey = the apikey above; Content-Type = application/json
   Request Body (JSON): p_key = your habit key (Settings → API keys); p_habit_id = the id above
2. Get Dictionary Value: count, target, emoji, name
3. Show Notification: emoji name count/target
4. Name it "${h.name}". To add another habit, Duplicate and change only p_habit_id and the name.`

// Add (habit = null) or edit a habit. sortOrder is where a new one lands (the end).
export default function HabitSheet({ userId, habit, sortOrder, onClose, onSaved }: {
  userId: string; habit: Habit | null; sortOrder: number; onClose: () => void; onSaved: () => void
}) {
  const [emoji, setEmoji] = useState(habit?.emoji ?? '✅')
  const [name, setName] = useState(habit?.name ?? '')
  const [color, setColor] = useState(habit?.color ?? SWATCHES[5])
  const [target, setTarget] = useState(habit?.target ?? 1)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

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
    if (!name.trim()) return setError('Give the habit a name')
    commit(() => saveHabit(userId, habit, { emoji: emoji.trim() || '✅', name: name.trim(), color, target }, sortOrder))
  }

  const step = 'grid size-11 place-items-center rounded-full bg-paper text-xl font-semibold disabled:opacity-40'
  return (
    <Sheet onClose={onClose} label={habit ? `Edit ${habit.name}` : 'New habit'}
      header={
        <SheetHeader onClose={onClose} action={{ label: habit ? 'Save' : 'Add', onClick: save }}>
          <h3 className="font-round font-bold">{habit ? 'Edit habit' : 'New habit'}</h3>
        </SheetHeader>
      }>
      {error && <p className="mb-3 text-sm text-warn" role="alert">{error}</p>}
      <div className="mt-2 flex items-center gap-3">
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} aria-label="Emoji" style={{ background: tint(color) }}
          className="size-16 shrink-0 rounded-2xl text-center text-3xl outline-none focus-visible:outline-2" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" enterKeyHint="done"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
          autoFocus={!habit} className={field} />
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

      {habit && (
        <>
          {!habit.archived_at && <>
          <button onClick={() => navigator.clipboard.writeText(shortcutDetails(habit)).then(() => setCopied(true), (e) => setError(e.message))}
            className="mt-8 w-full rounded-xl bg-paper py-3 font-semibold">{copied ? 'Copied' : 'Copy Shortcut details'}</button>
          <p className="px-1 pt-1 text-center text-sm text-mute">For a one-tap iOS Shortcut. Paste in a habit-scoped API key.</p>
          </>}
          <button onClick={() => commit(() => setArchived(habit.id, true))} className="mt-8 w-full py-3 font-semibold text-warn">Archive habit</button>
          <p className="px-1 text-center text-sm text-mute">Hidden from Habits and Home. Check-ins are kept; unarchive any time.</p>
        </>
      )}
    </Sheet>
  )
}
