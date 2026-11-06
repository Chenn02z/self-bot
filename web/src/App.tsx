import { useState } from 'react'
import LoginPage from './features/auth/LoginPage'
import SettingsPage from './features/settings/SettingsPage'
import SpendingPage from './features/spending/SpendingPage'
import { useCategories } from './hooks/useCategories'
import { useSession } from './hooks/useSession'
import TabBar, { type Tab } from './ui/TabBar'

export default function App() {
  const session = useSession()
  if (session === undefined) return null
  if (!session) return <LoginPage />
  return <Shell userId={session.user.id} />
}

function Shell({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>('spending')
  const [adding, setAdding] = useState(false)
  const { cats, reload } = useCategories()

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-28 pt-[env(safe-area-inset-top)]">
      {tab === 'spending'
        ? <SpendingPage userId={userId} cats={cats} adding={adding} onAddClose={() => setAdding(false)} />
        : <SettingsPage userId={userId} cats={cats} reloadCats={reload} />}
      <TabBar tab={tab} onTab={setTab} onAdd={() => { setTab('spending'); setAdding(true) }} />
    </div>
  )
}
