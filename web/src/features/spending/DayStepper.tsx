import { cash } from '../../lib/money'
import { dayLabel } from '../../lib/dates'
import { sectionTitle } from '../../ui/styles'

// "‹ Today ›" — steps through days one at a time.
export default function DayStepper({ date, spent, canForward, onStep }: {
  date: Date; spent: number; canForward: boolean; onStep: (n: number) => void
}) {
  const arrow = 'grid size-9 shrink-0 place-items-center rounded-full bg-card text-lg disabled:opacity-30'
  return (
    <div className="flex items-center justify-between gap-3">
      <button className={arrow} onClick={() => onStep(-1)} aria-label="Previous day">‹</button>
      <div className="min-w-0 text-center" aria-live="polite">
        <h2 className={`${sectionTitle} truncate`}>{dayLabel(date)}</h2>
        <p className="text-sm text-mute tabular-nums">{spent !== 0 ? `${cash(spent)} spent` : 'Nothing spent'}</p>
      </div>
      <button className={arrow} onClick={() => onStep(1)} disabled={!canForward} aria-label="Next day">›</button>
    </div>
  )
}
