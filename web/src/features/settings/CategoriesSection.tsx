import { useState } from 'react'
import type { Category } from '../../lib/supabase'
import CategoryIcon from '../../ui/CategoryIcon'
import { surface } from '../../ui/styles'
import CategorySheet from './CategorySheet'
import { kindLabel } from './kinds'
import Section from './Section'

export default function CategoriesSection({ userId, cats, reload }: { userId: string; cats: Category[]; reload: () => void }) {
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const row = 'flex w-full items-center gap-3 px-4 py-2.5 text-left'
  return (
    <Section title="Categories">
      <ul className={`${surface} py-1`}>
        {cats.map((c) => (
          <li key={c.id}>
            <button onClick={() => setEditing(c)} className={row}>
              <CategoryIcon cat={c} size="sm" />
              <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
              {c.kind !== 'expense' && kindLabel(c.kind) !== c.name && <span className="text-sm text-mute">{kindLabel(c.kind)}</span>}
              <span className="text-mute" aria-hidden>›</span>
            </button>
          </li>
        ))}
        <li>
          <button onClick={() => setEditing('new')} className={`${row} font-semibold`}>
            <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-paper text-lg">+</span>
            Add category
          </button>
        </li>
      </ul>
      {editing && (
        <CategorySheet userId={userId} cat={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)} onSaved={reload} />
      )}
    </Section>
  )
}
