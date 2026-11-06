import { useCallback, useEffect, useState } from 'react'
import { createApiKey, listApiKeys, revokeApiKey, type ApiKey } from '../../lib/api'
import { smallField, surface } from '../../ui/styles'
import Section from './Section'

export default function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [label, setLabel] = useState('')
  const [scope, setScope] = useState('widget')
  const [created, setCreated] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => { listApiKeys().then(setKeys, (e) => setError(e.message)) }, [])
  useEffect(load, [load])

  async function create() {
    if (!label.trim()) return setError('Give the key a label')
    try {
      setCreated(await createApiKey(label.trim(), scope))
      setLabel('')
      setError('')
      load()
    } catch (e) {
      setError((e as Error).message)
    }
  }
  async function revoke(k: ApiKey) {
    if (!confirm(`Revoke “${k.label}”? Anything using it stops working.`)) return
    await revokeApiKey(k.key_hash).catch((e) => setError(e.message))
    load()
  }

  return (
    <Section title="API keys" hint="Widget keys power the home screen widget. Ingest keys let the email forwarder add transactions.">
      <div className={`${surface} p-4`}>
        {keys.length > 0 && (
          <ul className="mb-4 space-y-2">
            {keys.map((k) => (
              <li key={k.key_hash} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">{k.label} <span className="text-sm text-mute">({k.scope})</span></span>
                <button onClick={() => revoke(k)} className="text-sm font-semibold text-warn">Revoke</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input className={`${smallField} min-w-0 flex-1`} placeholder="Label, e.g. widget" aria-label="Key label"
            value={label} onChange={(e) => setLabel(e.target.value)} />
          <select className={smallField} value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Scope">
            <option value="widget">widget</option>
            <option value="ingest">ingest</option>
          </select>
          <button onClick={create} className="rounded-lg bg-ink px-3 text-sm font-semibold text-card">Create</button>
        </div>
        {error && <p className="mt-2 text-sm text-warn" role="alert">{error}</p>}
        {created && (
          <div className="mt-4 rounded-xl bg-paper p-3 text-sm">
            <p className="font-semibold">Copy this key now. It won’t be shown again.</p>
            <code className="mt-1 block break-all">{created}</code>
            <button onClick={() => navigator.clipboard.writeText(created)} className="mt-2 font-semibold">Copy key</button>
          </div>
        )}
      </div>
    </Section>
  )
}
