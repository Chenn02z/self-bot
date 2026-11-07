import { useState } from 'react'
import LoginPage from './features/auth/LoginPage'
import HabitsPage from './features/habits/HabitsPage'
import HomePage, { type Screen } from './features/home/HomePage'
import SettingsPage from './features/settings/SettingsPage'
import SpendingPage from './features/spending/SpendingPage'
import { useCategories } from './hooks/useCategories'
import { useSession } from './hooks/useSession'

export default function App() {
  const session = useSession()
  if (session === undefined) return null
  if (!session) return <LoginPage />
  return <Shell userId={session.user.id} />
}

function Shell({ userId }: { userId: string }) {
  const [screen, setScreen] = useState<Screen | 'home'>('home')
  const { cats, reload } = useCategories()
  const home = () => setScreen('home')

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
      {screen === 'home' && <HomePage userId={userId} cats={cats} onOpen={setScreen} />}
      {screen === 'spending' && <SpendingPage userId={userId} cats={cats} reloadCats={reload} onBack={home} />}
      {screen === 'habits' && <HabitsPage userId={userId} onBack={home} />}
      {screen === 'settings' && <SettingsPage userId={userId} onBack={home} />}
    </div>
  )
}
