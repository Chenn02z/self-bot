import BackButton from '../../ui/BackButton'
import { pageTitle } from '../../ui/styles'
import AccountSection from './AccountSection'
import ApiKeysSection from './ApiKeysSection'
import OwnAccountsSection from './OwnAccountsSection'

// App-wide settings. Module settings (e.g. spending categories) live inside each module.
export default function SettingsPage({ userId, onBack }: { userId: string; onBack: () => void }) {
  return (
    <div className="px-5">
      <BackButton onBack={onBack} label="Home" />
      <div className="space-y-9 pt-4">
        <h1 className={pageTitle}>Settings</h1>
        <OwnAccountsSection userId={userId} />
        <ApiKeysSection />
        <AccountSection />
      </div>
    </div>
  )
}
