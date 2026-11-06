import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Both values are public by design; RLS protects the data.
export const supabase = createClient<Database>(
  'https://bfpeqizfymrmsoxjbmhp.supabase.co',
  'sb_publishable_mfloIXxPU2pDFhPKiomiJQ_DOYrZl4y',
)

export type Tx = Database['public']['Tables']['transactions']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Kind = 'expense' | 'income' | 'transfer'
