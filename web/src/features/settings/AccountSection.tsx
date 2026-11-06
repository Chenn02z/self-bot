import { useState } from 'react'
import { changePassword, signOut } from '../../lib/api'
import { smallField, surface } from '../../ui/styles'
import Section from './Section'

export default function AccountSection() {
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  async function change() {
    if (password.length < 10) return setMsg('Use at least 10 characters')
    try {
      await changePassword(password)
      setMsg('Password changed')
      setPassword('')
    } catch (e) {
      setMsg((e as Error).message)
    }
  }
  return (
    <div className="pb-4">
      <Section title="Account">
        <div className={`${surface} p-4`}>
          <div className="flex gap-2">
            <input className={`${smallField} min-w-0 flex-1`} type="password" autoComplete="new-password" placeholder="New password"
              aria-label="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button onClick={change} className="rounded-lg bg-paper px-3 text-sm font-semibold">Change password</button>
          </div>
          {msg && <p className="mt-2 text-sm text-mute" role="status">{msg}</p>}
        </div>
      </Section>
      <button onClick={() => signOut()} className={`${surface} mt-3 w-full py-3 font-semibold text-warn`}>Sign out</button>
    </div>
  )
}
