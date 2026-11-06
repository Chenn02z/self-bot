// Big centred amount. A hidden twin of the text sizes the input to exactly its content,
// so the currency symbol and figures centre as one group at any length.
export default function AmountInput({ value, onChange, currency, autoFocus }: {
  value: string; onChange: (v: string) => void; currency: string; autoFocus?: boolean
}) {
  return (
    <label className="flex items-baseline justify-center gap-1 font-round">
      <span className="text-2xl font-semibold text-mute">{currency}</span>
      <span className="inline-grid text-6xl font-bold tracking-tight tabular-nums">
        <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre">{value || '0.00'}</span>
        {/* size=1 stops the input's default ~20ch width from widening the grid */}
        <input size={1} inputMode="decimal" placeholder="0.00" value={value} autoFocus={autoFocus} aria-label="Amount"
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
          className="col-start-1 row-start-1 w-full min-w-0 bg-transparent text-6xl placeholder:text-line caret-ink outline-none" />
      </span>
    </label>
  )
}
