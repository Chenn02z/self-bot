// Pure habit maths. Kept free of React so it can be checked directly (stats.check.ts).
// Days are Singapore calendar days as 'YYYY-MM-DD' strings, the same as check_ins.day.
type HabitLike = { id: string; target: number; archived_at: string | null }
type CheckInLike = { habit_id: string; day: string }

// Calendar arithmetic on 'YYYY-MM-DD', done in UTC so no local timezone or DST can shift the day.
export const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function habitStats<H extends HabitLike>(habits: H[], checkIns: CheckInLike[], today: string) {
  const stats = habits.filter((h) => !h.archived_at).map((habit) => {
    const perDay = new Map<string, number>()
    for (const c of checkIns) if (c.habit_id === habit.id) perDay.set(c.day, (perDay.get(c.day) ?? 0) + 1)
    const met = (day: string) => (perDay.get(day) ?? 0) >= habit.target

    // Ends today if today is done, otherwise yesterday: an unfinished today doesn't break it.
    let streak = 0
    for (let d = met(today) ? today : addDays(today, -1); met(d); d = addDays(d, -1)) streak++

    const week = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(today, i - 6)
      return { day, count: perDay.get(day) ?? 0, done: met(day) }
    })

    const count = perDay.get(today) ?? 0
    return { habit, count, done: met(today), streak, week }
  })
  return { habits: stats, done: stats.filter((s) => s.done).length, total: stats.length }
}
