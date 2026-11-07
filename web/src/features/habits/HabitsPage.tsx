import { useState } from 'react'
import { useHabits } from '../../hooks/useHabits'
import BackButton from '../../ui/BackButton'
import { pageTitle, surface, tint } from '../../ui/styles'
import HabitSheet from './HabitSheet'
import { habitStats } from './stats'

export default function HabitsPage({ userId, onBack }: { userId: string; onBack: () => void }) {
  const { habits, checkIns, today, reload, tap } = useHabits(userId)
  const [adding, setAdding] = useState(false)
  const stats = habitStats(habits, checkIns, today)

  return (
    <div className="space-y-4 px-5">
      <BackButton onBack={onBack} label="Home" />
      <h1 className={pageTitle}>Habits</h1>

      <ul className="space-y-3">
        {stats.habits.map(({ habit: h, count, done }) => (
          <li key={h.id}>
            <button onClick={() => tap(h.id)} aria-label={`${h.name}, ${count} of ${h.target}. Tap to check in.`}
              className={`${surface} flex w-full items-center gap-4 px-4 py-3 text-left active:scale-[0.98] motion-reduce:active:scale-100`}
              style={done ? { background: tint(h.color) } : undefined}>
              <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: tint(h.color) }}>{h.emoji}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{h.name}</span>
              <span className="font-round text-xl font-bold tabular-nums">
                {count}<span className="text-mute">/{h.target}</span>
              </span>
              <span aria-hidden className="grid size-8 place-items-center rounded-full text-card"
                style={{ background: done ? h.color : 'var(--line)' }}>{done ? '✓' : '+'}</span>
            </button>
          </li>
        ))}
      </ul>

      {stats.total === 0 && <p className="px-1 text-mute">No habits yet. Add one to start checking in.</p>}

      <button onClick={() => setAdding(true)} className={`${surface} w-full px-4 py-3 font-semibold`}>+ New habit</button>

      {adding && <HabitSheet userId={userId} onClose={() => setAdding(false)} onSaved={reload} />}
    </div>
  )
}
