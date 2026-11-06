import { useEffect, useState } from 'react'
import { supabase, type Category } from './supabase'

type Key = { key_hash: string; label: string; scope: string; created_at: string }

export default function Settings({ cats, reloadCats }: { cats: Category[]; reloadCats: () => void }) {
  return (
    <div className="space-y-10 px-5 pt-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Categories cats={cats} reload={reloadCats} />
      <OwnAccounts />
      <ApiKeys />
      <Account />
    </div>
  )
}

const input = 'rounded-lg bg-gray-100 px-3 py-2'
const h2 = 'mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400'

function Categories({ cats, reload }: { cats: Category[]; reload: () => void }) {
  async function patch(id: string, fields: Partial<Category>) {
    await supabase.from('categories').update(fields).eq('id', id)
    reload()
  }
  async function add() {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('categories').insert({ user_id: user!.id, name: `New ${cats.length + 1}`, emoji: '🏷️' })
    if (error) alert(error.message)
    reload()
  }
  async function remove(c: Category) {
    if (!confirm(`Delete "${c.name}"? Its transactions become uncategorised.`)) return
    await supabase.from('categories').delete().eq('id', c.id)
    reload()
  }

  return (
    <section>
      <h2 className={h2}>Categories</h2>
      <ul className="space-y-2">
        {cats.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <input className={`${input} w-12 text-center`} defaultValue={c.emoji} aria-label="Emoji"
              onBlur={(e) => e.target.value !== c.emoji && patch(c.id, { emoji: e.target.value })} />
            <input className={`${input} min-w-0 flex-1`} defaultValue={c.name} aria-label="Name"
              onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && patch(c.id, { name: e.target.value.trim() })} />
            <input type="color" className="size-9 shrink-0 rounded-lg" defaultValue={c.color} aria-label="Colour"
              onBlur={(e) => e.target.value !== c.color && patch(c.id, { color: e.target.value })} />
            <select className={`${input} shrink-0`} value={c.kind} aria-label="Kind"
              onChange={(e) => patch(c.id, { kind: e.target.value })}>
              <option value="expense">Spend</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
            <button onClick={() => remove(c)} className="px-1 text-gray-300" aria-label={`Delete ${c.name}`}>✕</button>
          </li>
        ))}
      </ul>
      <button onClick={add} className="mt-3 text-sm font-semibold">+ Add category</button>
      <p className="mt-2 text-xs text-gray-400">Spend counts toward totals. Income and Transfer are listed but not counted.</p>
    </section>
  )
}

function OwnAccounts() {
  const [hint, setHint] = useState<string | null>(null)
  useEffect(() => {
    supabase.from('profiles').select('own_accounts_hint').single().then(({ data }) => setHint(data?.own_accounts_hint ?? ''))
  }, [])
  if (hint === null) return null
  return (
    <section>
      <h2 className={h2}>My own accounts</h2>
      <textarea className={`${input} w-full`} rows={2} defaultValue={hint}
        placeholder="e.g. REVOLUT, YOUTRIP, YEO YU CHEN"
        onBlur={async (e) => {
          const { data: { user } } = await supabase.auth.getUser()
          await supabase.from('profiles').update({ own_accounts_hint: e.target.value }).eq('user_id', user!.id)
        }} />
      <p className="mt-1 text-xs text-gray-400">Helps the AI tag money moved between your own accounts as Transfer.</p>
    </section>
  )
}

function ApiKeys() {
  const [keys, setKeys] = useState<Key[]>([])
  const [label, setLabel] = useState('')
  const [scope, setScope] = useState('widget')
  const [created, setCreated] = useState('')

  const load = () => supabase.from('api_keys').select('key_hash, label, scope, created_at').order('created_at')
    .then(({ data }) => setKeys(data ?? []))
  useEffect(() => { load() }, [])

  async function create() {
    if (!label.trim()) return
    const { data, error } = await supabase.rpc('create_api_key', { p_label: label.trim(), p_scope: scope })
    if (error) return alert(error.message)
    setCreated(data)
    setLabel('')
    load()
  }
  async function revoke(k: Key) {
    if (!confirm(`Revoke "${k.label}"? Anything using it stops working.`)) return
    await supabase.from('api_keys').delete().eq('key_hash', k.key_hash)
    load()
  }

  return (
    <section>
      <h2 className={h2}>API keys</h2>
      <ul className="space-y-1">
        {keys.map((k) => (
          <li key={k.key_hash} className="flex items-center justify-between text-sm">
            <span>{k.label} <span className="text-gray-400">· {k.scope}</span></span>
            <button onClick={() => revoke(k)} className="text-red-500">Revoke</button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input className={`${input} min-w-0 flex-1`} placeholder="Label, e.g. widget" value={label} onChange={(e) => setLabel(e.target.value)} />
        <select className={input} value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="widget">widget</option>
          <option value="ingest">ingest</option>
        </select>
        <button onClick={create} className="rounded-lg bg-neutral-800 px-3 text-sm font-semibold text-white">Create</button>
      </div>
      {created && (
        <div className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm">
          <p className="font-semibold">Copy this key now. It won't be shown again.</p>
          <code className="mt-1 block break-all">{created}</code>
          <button onClick={() => navigator.clipboard.writeText(created)} className="mt-2 font-semibold">Copy</button>
        </div>
      )}
    </section>
  )
}

function Account() {
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  async function change() {
    if (password.length < 10) return setMsg('Use at least 10 characters')
    const { error } = await supabase.auth.updateUser({ password })
    setMsg(error ? error.message : 'Password changed')
    setPassword('')
  }
  return (
    <section>
      <h2 className={h2}>Account</h2>
      <div className="flex gap-2">
        <input className={`${input} min-w-0 flex-1`} type="password" autoComplete="new-password" placeholder="New password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={change} className="rounded-lg bg-gray-100 px-3 text-sm font-semibold">Change</button>
      </div>
      {msg && <p className="mt-1 text-xs text-gray-500">{msg}</p>}
      <button onClick={() => supabase.auth.signOut()} className="mt-6 font-semibold text-red-500">Sign out</button>
    </section>
  )
}
