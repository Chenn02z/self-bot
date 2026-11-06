import { useEffect, useState } from 'react'
import { getOwnAccountsHint, setOwnAccountsHint } from '../../lib/api'
import { surface } from '../../ui/styles'
import Section from './Section'

export default function OwnAccountsSection({ userId }: { userId: string }) {
  const [hint, setHint] = useState<string | null>(null)
  useEffect(() => { getOwnAccountsHint().then(setHint, console.error) }, [])
  if (hint === null) return null
  return (
    <Section title="My own accounts" hint="Names that appear when you move money to yourself. The AI tags those as Transfer.">
      <textarea className={`${surface} block w-full px-4 py-3 placeholder:text-mute`} rows={2} defaultValue={hint}
        aria-label="My own accounts" placeholder="e.g. REVOLUT, YOUTRIP, YEO YU CHEN"
        onBlur={(e) => { if (e.target.value !== hint) setOwnAccountsHint(userId, e.target.value).then(() => setHint(e.target.value), (err) => alert(err.message)) }} />
    </Section>
  )
}
