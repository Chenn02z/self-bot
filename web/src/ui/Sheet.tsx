import { useEffect } from 'react'

// Bottom sheet for editors. Closes on backdrop tap or Escape.
export default function Sheet({ onClose, label, children }: { onClose: () => void; label: string; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/40" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}
        className="sheet-in mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-card px-5 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  )
}

// Close button on the left, centred content, balanced spacer on the right.
export function SheetHeader({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full bg-paper text-mute" aria-label="Close">✕</button>
      <div className="flex min-w-0 flex-1 justify-center">{children}</div>
      <span className="size-9 shrink-0" />
    </div>
  )
}
