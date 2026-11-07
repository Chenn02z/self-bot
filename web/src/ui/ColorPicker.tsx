export const SWATCHES = ['#FF9500', '#FF3B30', '#FF2D55', '#AF52DE', '#5856D6', '#007AFF',
  '#30B0C7', '#34C759', '#FFCC00', '#A2845E', '#8E8E93', '#636366']

export default function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-3" role="radiogroup" aria-label="Colour">
      {SWATCHES.map((s) => (
        <button key={s} role="radio" aria-checked={value === s} aria-label={s} onClick={() => onChange(s)}
          className={`aspect-square rounded-full ${value === s ? 'ring-2 ring-ink ring-offset-2 ring-offset-card' : ''}`}
          style={{ background: s }} />
      ))}
    </div>
  )
}
