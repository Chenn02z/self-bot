export default function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void
}) {
  return (
    <div className="flex w-full rounded-xl bg-paper p-1 text-sm font-semibold">
      {options.map(([v, label]) => (
        <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
          className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 ${value === v ? 'bg-card shadow-sm' : 'text-mute'}`}>{label}</button>
      ))}
    </div>
  )
}
