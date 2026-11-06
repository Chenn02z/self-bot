import type { Category } from '../../lib/supabase'
import { pageTitle } from '../../ui/styles'
import AccountSection from './AccountSection'
import ApiKeysSection from './ApiKeysSection'
import CategoriesSection from './CategoriesSection'
import OwnAccountsSection from './OwnAccountsSection'

export default function SettingsPage({ userId, cats, reloadCats }: { userId: string; cats: Category[]; reloadCats: () => void }) {
  return (
    <div className="space-y-9 px-5 pt-6">
      <h1 className={pageTitle}>Settings</h1>
      <CategoriesSection userId={userId} cats={cats} reload={reloadCats} />
      <OwnAccountsSection userId={userId} />
      <ApiKeysSection />
      <AccountSection />
    </div>
  )
}
