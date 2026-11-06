import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import Home from './Home'
import Settings from './Settings'
import { supabase, type Category } from './supabase'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <Login />
  return <Main userId={session.user.id} />
}

function Main({ userId }: { userId: string }) {
  const [tab, setTab] = useState<'home' | 'settings'>('home')
  const [cats, setCats] = useState<Category[]>([])
  const [adding, setAdding] = useState(false)

  const loadCats = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCats(data ?? [])
  }, [])
  useEffect(() => { loadCats() }, [loadCats])

  return (
    <div className="mx-auto max-w-md min-h-dvh pb-28 pt-[env(safe-area-inset-top)]">
      {tab === 'home'
        ? <Home userId={userId} cats={cats} adding={adding} onAddClose={() => setAdding(false)} />
        : <Settings cats={cats} reloadCats={loadCats} />}

      <nav className="fixed inset-x-0 bottom-0 border-t border-gray-100 bg-white/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md items-center justify-around py-2">
          <TabBtn active={tab === 'home'} onClick={() => setTab('home')} label="Home" icon="▤" />
          <button
            onClick={() => { setTab('home'); setAdding(true) }}
            className="rounded-2xl bg-neutral-800 px-7 py-2 text-2xl leading-none text-white active:scale-95"
            aria-label="Add transaction"
          >+</button>
          <TabBtn active={tab === 'settings'} onClick={() => setTab('settings')} label="Settings" icon="⚙" />
        </div>
      </nav>
    </div>
  )
}

function TabBtn({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: string }) {
  return (
    <button onClick={onClick} aria-label={label}
      className={`w-16 text-2xl ${active ? 'text-neutral-900' : 'text-neutral-300'}`}>{icon}</button>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(error.message)
  }

  return (
    <form onSubmit={submit} className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-3 px-6">
      <h1 className="mb-4 text-3xl font-bold">Spend</h1>
      <input className="rounded-xl bg-gray-100 px-4 py-3" type="email" autoComplete="username" placeholder="Email"
        value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="rounded-xl bg-gray-100 px-4 py-3" type="password" autoComplete="current-password" placeholder="Password"
        value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button disabled={busy} className="mt-2 rounded-xl bg-neutral-800 py-3 font-semibold text-white disabled:opacity-50">
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
