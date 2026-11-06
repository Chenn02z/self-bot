export type Tab = 'spending' | 'settings'

const ICONS: Record<Tab, React.ReactNode> = {
  spending: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  settings: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
}

export default function TabBar({ tab, onTab, onAdd }: { tab: Tab; onTab: (t: Tab) => void; onAdd: () => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card/85 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-center justify-around py-1.5">
        <TabButton tab="spending" label="Spending" active={tab} onTab={onTab} />
        <button onClick={onAdd} aria-label="Add transaction"
          className="grid size-12 place-items-center rounded-full bg-ink text-card active:scale-95 motion-reduce:active:scale-100">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <TabButton tab="settings" label="Settings" active={tab} onTab={onTab} />
      </div>
    </nav>
  )
}

function TabButton({ tab, label, active, onTab }: { tab: Tab; label: string; active: Tab; onTab: (t: Tab) => void }) {
  const on = tab === active
  return (
    <button onClick={() => onTab(tab)} aria-current={on ? 'page' : undefined}
      className={`flex w-20 flex-col items-center gap-0.5 text-[11px] font-semibold ${on ? 'text-ink' : 'text-mute'}`}>
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONS[tab]}</svg>
      {label}
    </button>
  )
}
