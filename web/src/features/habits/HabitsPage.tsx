import { useState } from 'react'
import { useHabits } from '../../hooks/useHabits'
import { setArchived } from '../../lib/api'
import type { Habit } from '../../lib/supabase'
import BackButton from '../../ui/BackButton'
import { pageTitle, sectionTitle, surface, tint } from '../../ui/styles'
import HabitSheet from './HabitSheet'
import { habitStats } from './stats'

// 'YYYY-MM-DD' labels, read in UTC so the browser's timezone can't shift the day
const fmt = (day: string, o: Intl.DateTimeFormatOptions) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-SG', { ...o, timeZone: 'UTC' })
const weekdayLetter = (day: string) => fmt(day, { weekday: 'narrow' })
const fullDate = (day: string) => fmt(day, { weekday: 'long', day: 'numeric', month: 'short' })

export default function HabitsPage({ userId, onBack }: { userId: string; onBack: () => void }) {
  const { habits, checkIns, today, reload, tap, adjust, move } = useHabits(userId)
  const [sheet, setSheet] = useState<Habit | 'new' | null>(null)
  const [arranging, setArranging] = useState(false)
  const [fixing, setFixing] = useState<{ habitId: string; day: string } | null>(null)
  const stats = habitStats(habits, checkIns, today)
  const archived = habits.filter((h) => h.archived_at)
  // "The end of the list" for both new and unarchived habits
  const end = Math.max(-1, ...stats.habits.map((s) => s.habit.sort_order)) + 1
  const editing = arranging && stats.total > 0 // archiving the last habit leaves edit mode
  const unarchive = (id: string) => setArchived(id, false, end).then(reload, (e) => { console.error(e); alert((e as Error).message) })

  const stepBtn = 'grid size-10 place-items-center rounded-full bg-paper text-xl font-semibold disabled:opacity-40'
  return (
    <div className="space-y-4 px-5">
      <BackButton onBack={onBack} label="Home" />
      <div className="flex items-end justify-between">
        <h1 className={pageTitle}>Habits</h1>
        {stats.total > 0 && (
          <button onClick={() => { setArranging(!editing); setFixing(null) }} aria-pressed={editing}
            className="rounded-full bg-paper px-4 py-1.5 text-sm font-semibold">{editing ? 'Done' : 'Edit'}</button>
        )}
      </div>

      <ul className="space-y-3">
        {stats.habits.map(({ habit: h, count, done, streak, week }, i) => {
          if (editing) return (
            <li key={h.id} className={`${surface} flex items-center gap-3 px-4 py-3`}>
              <button onClick={() => setSheet(h)} aria-label={`Edit ${h.name}`} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: tint(h.color) }}>{h.emoji}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{h.name}</span>
                <span aria-hidden className="text-mute">›</span>
              </button>
              <button onClick={() => move(h.id, -1)} disabled={i === 0} aria-label={`Move ${h.name} up`} className={stepBtn}>↑</button>
              <button onClick={() => move(h.id, 1)} disabled={i === stats.total - 1} aria-label={`Move ${h.name} down`} className={stepBtn}>↓</button>
            </li>
          )
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

      <button onClick={() => setSheet('new')} className={`${surface} w-full px-4 py-3 font-semibold`}>+ New habit</button>

      {archived.length > 0 && (
        <details className="group">
          <summary className={`${surface} flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden`}>
            <h2 className={`${sectionTitle} flex-1`}>Archived</h2>
            <span className="text-sm text-mute">{archived.length}</span>
            <span aria-hidden className="text-mute transition-transform group-open:rotate-90 motion-reduce:transition-none">›</span>
          </summary>
          <ul className={`${surface} mt-2 py-1`}>
            {archived.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-4 py-2.5">
                <span aria-hidden className="grid size-9 place-items-center rounded-xl text-lg" style={{ background: tint(h.color) }}>{h.emoji}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{h.name}</span>
                <button onClick={() => unarchive(h.id)} className="rounded-full bg-paper px-3 py-1.5 text-sm font-semibold">Unarchive</button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {sheet && <HabitSheet userId={userId} habit={sheet === 'new' ? null : sheet} sortOrder={end}
        onClose={() => setSheet(null)} onSaved={reload} />}
    </div>
  )
}
