import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Both values are public by design; RLS protects the data.
export const SUPABASE_URL = 'https://bfpeqizfymrmsoxjbmhp.supabase.co'
export const PUBLISHABLE_KEY = 'sb_publishable_mfloIXxPU2pDFhPKiomiJQ_DOYrZl4y'
export const supabase = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY)

export type Tx = Database['public']['Tables']['transactions']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Kind = 'expense' | 'income' | 'transfer'
export type Habit = Database['public']['Tables']['habits']['Row']
export type CheckIn = Pick<Database['public']['Tables']['check_ins']['Row'], 'habit_id' | 'day'>
