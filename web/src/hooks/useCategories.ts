import { useCallback, useEffect, useState } from 'react'
import { listCategories } from '../lib/api'
import type { Category } from '../lib/supabase'

export function useCategories() {
  const [cats, setCats] = useState<Category[]>([])
  const reload = useCallback(() => { listCategories().then(setCats, console.error) }, [])
  useEffect(reload, [reload])
  return { cats, reload }
}
