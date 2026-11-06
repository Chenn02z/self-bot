import type { Category } from '../lib/supabase'
import { tint } from './styles'

const SIZES = { sm: 'size-9 text-base', md: 'size-10 text-lg' }

// Emoji on a tint of the category colour. No category = still being classified.
export default function CategoryIcon({ cat, size = 'md' }: { cat?: Pick<Category, 'emoji' | 'color'>; size?: keyof typeof SIZES }) {
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-xl ${SIZES[size]}`} style={{ background: tint(cat?.color) }}>
      {cat?.emoji ?? '❔'}
    </span>
  )
}
