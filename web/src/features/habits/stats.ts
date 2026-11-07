// Pure habit maths. Kept free of React so it can be checked directly (stats.check.ts).
// Days are Singapore calendar days as 'YYYY-MM-DD' strings, the same as check_ins.day.
type HabitLike = { id: string; target: number; archived_at: string | null }
type CheckInLike = { habit_id: string; day: string }

export function habitStats<H extends HabitLike>(habits: H[], checkIns: CheckInLike[], today: string) {
  const stats = habits.filter((h) => !h.archived_at).map((habit) => {
    const count = checkIns.filter((c) => c.habit_id === habit.id && c.day === today).length
    return { habit, count, done: count >= habit.target }
  })
  return { habits: stats, done: stats.filter((s) => s.done).length, total: stats.length }
}
