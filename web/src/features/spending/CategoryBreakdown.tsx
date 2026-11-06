import { cash } from '../../lib/money'
import type { Category } from '../../lib/supabase'
import CategoryIcon from '../../ui/CategoryIcon'
import { sectionTitle } from '../../ui/styles'
import type { Slice } from './summary'

// Spending per category, largest first. Tap one to filter the list.
export default function CategoryBreakdown({ slices, catById, selected, onPick }: {
  slices: Slice[]; catById: Map<string, Category>; selected: string | null; onPick: (id: string) => void
}) {
  if (slices.length === 0) return null
  const top = slices[0].total
  return (
    <section className="mt-8">
      <h2 className={sectionTitle}>Where it went</h2>
      <ul className="mt-2">
        {slices.map(({ id, total }) => {
          const c = catById.get(id)
          return (
            <li key={id}>
              <button onClick={() => onPick(id)} aria-pressed={selected === id}
                className={`flex w-full items-center gap-3 py-2 text-left ${selected !== null && selected !== id ? 'opacity-40' : ''}`}>
                <CategoryIcon cat={c} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium">{c?.name ?? 'Uncategorised'}</span>
                    <span className="font-round font-semibold tabular-nums">{cash(total)}</span>
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line">
                    <span className="block h-full rounded-full" style={{ width: `${(total / top) * 100}%`, background: c?.color ?? '#8E8E93' }} />
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
