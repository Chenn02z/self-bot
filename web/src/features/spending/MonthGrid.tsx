import { cash, compact } from '../../lib/money'
import { daysInMonth } from '../../lib/dates'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// The month as a calendar, each day shaded by how much was spent. Tap a day to filter the list.
export default function MonthGrid({ month, perDay, today, selected, onPick }: {
  month: Date; perDay: Map<number, number>; today: number | null; selected: number | null; onPick: (day: number) => void
}) {
  const lead = (month.getDay() + 6) % 7 // weeks start Monday
  const max = Math.max(1, ...perDay.values())
  const monthName = month.toLocaleDateString('en-SG', { month: 'long' })

  return (
    <div className="mt-6">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-mute" aria-hidden>
        {WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => <span key={`pad${i}`} />)}
        {Array.from({ length: daysInMonth(month) }, (_, i) => {
          const day = i + 1
          const spent = perDay.get(day) ?? 0
          return (
            <DayCell key={day} day={day} spent={spent} max={max} isToday={day === today}
              future={today !== null && day > today} selected={selected === day}
              label={`${day} ${monthName}, ${spent > 0 ? cash(spent) : 'nothing spent'}`} onPick={onPick} />
          )
        })}
      </div>
    </div>
  )
}

function DayCell({ day, spent, max, isToday, future, selected, label, onPick }: {
  day: number; spent: number; max: number; isToday: boolean; future: boolean; selected: boolean; label: string; onPick: (day: number) => void
}) {
  // sqrt so one big day (flights) doesn't wash out the rest
  const heat = spent > 0 ? 10 + 75 * Math.sqrt(spent / max) : 0
  return (
    <button onClick={() => onPick(day)} disabled={future} aria-pressed={selected} aria-label={label}
      className={`flex aspect-square flex-col justify-between rounded-lg p-1.5 text-left disabled:opacity-35
        ${selected ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''}`}
      style={{
        background: heat ? `color-mix(in srgb, var(--ink) ${heat}%, var(--card))` : 'var(--card)',
        color: heat > 45 ? 'var(--card)' : undefined,
      }}>
      <span className={`text-xs leading-none ${isToday ? 'font-extrabold underline decoration-2 underline-offset-2' : 'font-medium'}`}>{day}</span>
      {spent > 0 && <span className="self-end font-round text-[11px] font-semibold leading-none tabular-nums">{compact(spent)}</span>}
    </button>
  )
}
