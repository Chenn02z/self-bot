import { useEffect } from 'react'
import { useScrollLock } from '../hooks/useScrollLock'
import { useVisualViewport } from '../hooks/useVisualViewport'

// Bottom sheet for editors. Sized to the visible area so the iOS keyboard never covers it;
// the header stays put while the body scrolls. Closes on backdrop tap or Escape.
export default function Sheet({ onClose, label, header, children }: {
  onClose: () => void; label: string; header: React.ReactNode; children: React.ReactNode
}) {
  const vv = useVisualViewport()
  useScrollLock()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed top-0 left-0 z-20 flex flex-col justify-end bg-black/40" onClick={onClose}
      style={{ width: vv.width, height: vv.height, transform: `translate(${vv.left}px, ${vv.top}px)` }}>
      <div role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}
        className="sheet-in mx-auto flex max-h-[calc(100%-env(safe-area-inset-top)-0.75rem)] w-full max-w-md flex-col rounded-t-[28px] bg-card">
        <div className="shrink-0 px-5 pt-4 pb-3">{header}</div>
        <div className="min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  )
}

// Close on the left, centred content, the primary action on the right — always above the keyboard.
export function SheetHeader({ onClose, children, action }: {
  onClose: () => void; children: React.ReactNode; action: { label: string; onClick: () => void; disabled?: boolean }
}) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full bg-paper text-mute" aria-label="Close">✕</button>
      <div className="flex min-w-0 flex-1 justify-center">{children}</div>
      <button onClick={action.onClick} disabled={action.disabled}
        className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-card disabled:opacity-40">{action.label}</button>
    </div>
  )
}
