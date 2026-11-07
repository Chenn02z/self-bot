// The only module that talks to Supabase. Every call throws on failure, so callers can show the message.
import { supabase, type Category, type CheckIn, type Habit, type Tx } from './supabase'

type Result<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>
async function run<T>(q: Result<T>): Promise<T> {
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data as T
}

// Transactions
export type TxFields = Pick<Tx, 'direction' | 'amount' | 'merchant' | 'occurred_at' | 'category_id' | 'note'>

export async function listMonthTransactions(month: Date): Promise<Tx[]> {
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  return (await run(supabase.from('transactions').select('*')
    .eq('is_deleted', false)
    .gte('occurred_at', month.toISOString()).lt('occurred_at', end.toISOString())
    .order('occurred_at', { ascending: false }))) ?? []
}

export async function saveTransaction(userId: string, tx: Tx | null, f: TxFields) {
  if (tx) {
    await run(supabase.from('transactions').update({
      ...f,
      // a category the user picks is never overwritten by the classifier
      ...(f.category_id !== tx.category_id ? { category_source: f.category_id ? 'user' : null } : {}),
    }).eq('id', tx.id))
  } else {
    await run(supabase.from('transactions').insert({
      ...f, user_id: userId, merchant_raw: f.merchant, source: 'Manual',
      category_source: f.category_id ? 'user' : null, // null category -> AI classifies it
    }))
  }
}

export const deleteTransaction = (id: string) =>
  run(supabase.from('transactions').update({ is_deleted: true }).eq('id', id))

// Categories
export type CategoryFields = Pick<Category, 'emoji' | 'name' | 'color' | 'kind'>

export const listCategories = async (): Promise<Category[]> =>
  (await run(supabase.from('categories').select('*').order('name'))) ?? []

export async function saveCategory(userId: string, cat: Category | null, f: CategoryFields) {
  if (cat) await run(supabase.from('categories').update(f).eq('id', cat.id))
  else await run(supabase.from('categories').insert({ ...f, user_id: userId }))
}

export const deleteCategory = (id: string) => run(supabase.from('categories').delete().eq('id', id))

// Habits
export type HabitFields = Pick<Habit, 'emoji' | 'name' | 'color' | 'target'>

export const listHabits = async (): Promise<Habit[]> =>
  (await run(supabase.from('habits').select('*').order('sort_order').order('created_at'))) ?? []

export const createHabit = (userId: string, f: HabitFields) =>
  run(supabase.from('habits').insert({ ...f, user_id: userId }))

// Every check-in ever, paged past PostgREST's 1000-row cap: a streak can reach back arbitrarily far.
// ponytail: full-history fetch on each load; compute streaks in SQL if this gets slow.
const PAGE = 1000
export async function listCheckIns(): Promise<CheckIn[]> {
  const all: CheckIn[] = []
  for (let from = 0; ; from += PAGE) {
    const page = (await run(supabase.from('check_ins').select('habit_id, day')
      .order('day', { ascending: false }).order('id').range(from, from + PAGE - 1))) ?? []
    all.push(...page)
    if (page.length < PAGE) return all
  }
}

// One tap = one row. Without a day, the database stamps today's Singapore day.
export const checkIn = (userId: string, habitId: string, day?: string) =>
  run(supabase.from('check_ins').insert({ user_id: userId, habit_id: habitId, ...(day ? { day } : {}) }))

// Removes one check-in from that day; a day with none is left alone, so a count never goes below 0.
export async function removeCheckIn(habitId: string, day: string) {
  const [row] = (await run(supabase.from('check_ins').select('id').eq('habit_id', habitId).eq('day', day).limit(1))) ?? []
  if (row) await run(supabase.from('check_ins').delete().eq('id', row.id))
}

// Profile
export async function getOwnAccountsHint() {
  const { data, error } = await supabase.from('profiles').select('own_accounts_hint').single()
  if (error) throw new Error(error.message)
  return data.own_accounts_hint ?? ''
}

export const setOwnAccountsHint = (userId: string, hint: string) =>
  run(supabase.from('profiles').update({ own_accounts_hint: hint }).eq('user_id', userId))

// API keys
export type ApiKey = { key_hash: string; label: string; scope: string; created_at: string }

export const listApiKeys = async (): Promise<ApiKey[]> =>
  (await run(supabase.from('api_keys').select('key_hash, label, scope, created_at').order('created_at'))) ?? []

export const createApiKey = (label: string, scope: string) =>
  run(supabase.rpc('create_api_key', { p_label: label, p_scope: scope }))

export const revokeApiKey = (hash: string) => run(supabase.from('api_keys').delete().eq('key_hash', hash))

// Auth
const authRun = async (q: Promise<{ error: { message: string } | null }>) => {
  const { error } = await q
  if (error) throw new Error(error.message)
}
export const signIn = (email: string, password: string) => authRun(supabase.auth.signInWithPassword({ email, password }))
export const changePassword = (password: string) => authRun(supabase.auth.updateUser({ password }))
export const signOut = () => authRun(supabase.auth.signOut())
