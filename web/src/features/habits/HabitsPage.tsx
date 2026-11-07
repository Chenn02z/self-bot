import { useState } from 'react'
import { useHabits } from '../../hooks/useHabits'
import BackButton from '../../ui/BackButton'
import { pageTitle, surface, tint } from '../../ui/styles'
import HabitSheet from './HabitSheet'
import { habitStats } from './stats'

// 'YYYY-MM-DD' labels, read in UTC so the browser's timezone can't shift the day
const fmt = (day: string, o: Intl.DateTimeFormatOptions) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-SG', { ...o, timeZone: 'UTC' })
const weekdayLetter = (day: string) => fmt(day, { weekday: 'narrow' })
const fullDate = (day: string) => fmt(day, { weekday: 'long', day: 'numeric', month: 'short' })

export default function HabitsPage({ userId, onBack }: { userId: string; onBack: () => void }) {
  const { habits, checkIns, today, reload, tap, adjust } = useHabits(userId)
  const [adding, setAdding] = useState(false)
  const [fixing, setFixing] = useState<{ habitId: string; day: string } | null>(null)
  const stats = habitStats(habits, checkIns, today)

  const stepBtn = 'grid size-10 place-items-center rounded-full bg-paper text-xl font-semibold disabled:opacity-40'
  return (
    <div className="space-y-4 px-5">
      <BackButton onBack={onBack} label="Home" />
      <h1 className={pageTitle}>Habits</h1>

      <ul className="space-y-3">
        {stats.habits.map(({ habit: h, count, done, streak, week }) => {
          const fix = fixing?.habitId === h.id ? week.find((d) => d.day === fixing.day) : undefined
          return (
            <li key={h.id} className={`${surface} px-4 py-3`} style={done ? { background: tint(h.color) } : undefined}>
              <button onClick={() => tap(h.id)} aria-label={`${h.name}, ${count} of ${h.target}. Tap to check in.`}
                className="flex w-full items-center gap-4 text-left active:scale-[0.98] motion-reduce:active:scale-100">
                <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: tint(h.color) }}>{h.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{h.name}</span>
                  <span className="block text-sm text-mute">{streak === 0 ? 'No streak yet' : `🔥 ${streak}-day streak`}</span>
                </span>
                <span className="font-round text-xl font-bold tabular-nums">
                  {count}<span className="text-mute">/{h.target}</span>
                </span>
                <span aria-hidden className="grid size-8 place-items-center rounded-full text-card"
                  style={{ background: done ? h.color : 'var(--line)' }}>{done ? '✓' : '+'}</span>
              </button>

              <div className="mt-3 flex justify-between">
                {week.map((d) => (
                  <button key={d.day} onClick={() => setFixing(fix?.day === d.day ? null : { habitId: h.id, day: d.day })}
                    aria-label={`${fullDate(d.day)}: ${d.count} of ${h.target}${d.done ? ', done' : ''}. Tap to fix.`}
                    aria-pressed={fix?.day === d.day}
                    className="flex flex-col items-center gap-1 px-1 text-xs text-mute">
                    <span aria-hidden className={`size-6 rounded-full ${fix?.day === d.day ? 'outline-2 outline-offset-2' : ''}`}
                      style={{ background: d.done ? h.color : 'var(--line)', outlineColor: h.color }} />
                    <span aria-hidden className={d.day === today ? 'font-bold text-ink' : ''}>{weekdayLetter(d.day)}</span>
                  </button>
                ))}
              </div>

              {fix && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-paper/60 px-3 py-2">
                  <span className="text-sm font-semibold">{fix.day === today ? 'Today' : fullDate(fix.day)}</span>
                  <span className="flex items-center gap-3">
                    <button onClick={() => adjust(h.id, fix.day, -1)} disabled={fix.count === 0} aria-label="Remove a check-in" className={stepBtn}>−</button>
                    <span className="w-12 text-center font-round font-bold tabular-nums" aria-live="polite">{fix.count}/{h.target}</span>
                    <button onClick={() => adjust(h.id, fix.day, 1)} aria-label="Add a check-in" className={stepBtn}>+</button>
                  </span>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {stats.total === 0 && <p className="px-1 text-mute">No habits yet. Add one to start checking in.</p>}

      <button onClick={() => setAdding(true)} className={`${surface} w-full px-4 py-3 font-semibold`}>+ New habit</button>

      {adding && <HabitSheet userId={userId} onClose={() => setAdding(false)} onSaved={reload} />}
    </div>
  )
}
