export const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)
export const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
export const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()

export function dayLabel(d: Date) {
  const today = new Date()
  const yest = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'short' })
}

export const timeLabel = (d: Date) => d.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' })

// Value for <input type="datetime-local">
export function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
