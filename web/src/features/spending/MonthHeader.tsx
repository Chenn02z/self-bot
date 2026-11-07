import { pageTitle } from '../../ui/styles'

export default function MonthHeader({ month, canGoForward, onShift }: { month: Date; canGoForward: boolean; onShift: (n: number) => void }) {
  const arrow = 'grid size-9 place-items-center rounded-full bg-card text-lg disabled:opacity-30'
  return (
    <header className="flex items-center justify-between pt-4">
      <h1 className={pageTitle}>
        {month.toLocaleDateString('en-SG', { month: 'long' })} <span className="font-semibold text-mute">{month.getFullYear()}</span>
      </h1>
      <div className="flex gap-2">
        <button className={arrow} onClick={() => onShift(-1)} aria-label="Previous month">‹</button>
        <button className={arrow} onClick={() => onShift(1)} disabled={!canGoForward} aria-label="Next month">›</button>
      </div>
    </header>
  )
}
