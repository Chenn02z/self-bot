import { useState } from 'react'
import { signIn } from '../../lib/api'
import { primaryBtn } from '../../ui/styles'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const input = 'rounded-xl bg-card px-4 py-3 placeholder:text-mute'
  return (
    <form onSubmit={submit} className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-3 px-6">
      <h1 className="font-round text-4xl font-bold">Spend</h1>
      <p className="mb-4 text-mute">Sign in to see where your money went.</p>
      <input className={input} type="email" autoComplete="username" placeholder="Email" aria-label="Email"
        value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className={input} type="password" autoComplete="current-password" placeholder="Password" aria-label="Password"
        value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="text-sm text-warn" role="alert">{error}</p>}
      <button disabled={busy} className={`mt-2 ${primaryBtn}`}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  )
}
