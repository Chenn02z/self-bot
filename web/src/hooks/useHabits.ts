import { useCallback, useEffect, useRef, useState } from 'react'
import { checkIn, listCheckIns, listHabits, removeCheckIn, setSortOrders } from '../lib/api'
import { reorder } from '../features/habits/stats'
import { sgtToday } from '../lib/dates'
import type { CheckIn, Habit } from '../lib/supabase'

// Habits plus their full check-in history, refreshed whenever the app comes back to the foreground.
export function useHabits(userId: string) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [today, setToday] = useState(sgtToday)

  const reload = useCallback(() => {
    const day = sgtToday()
    Promise.all([listHabits(), listCheckIns()])
      .then(([h, c]) => { setHabits(h); setCheckIns(c); setToday(day) }, console.error)
  }, [])

  useEffect(() => {
    reload()
    const onVisible = () => { if (document.visibilityState === 'visible') reload() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reload])

  // Writes run one after another, so a quick + then − (or − −) hits the server in tap order:
  // removeCheckIn's select-then-delete always sees the previous write.
  const queue = useRef(Promise.resolve())
  // Optimistic: local state changes now; a failed write resyncs from the server.
  // Past SGT midnight since the last load, the screen shows a stale day: write, then reload.
  const write = (local: (c: CheckIn[]) => CheckIn[], remote: () => Promise<unknown>) => {
    const stale = sgtToday() !== today
    if (!stale) setCheckIns(local)
    queue.current = queue.current.then(remote)
      .then(() => { if (stale) reload() }, (e) => { console.error(e); reload() })
  }

  // One tap = one check-in today.
  const tap = (habitId: string) =>
    write((c) => [...c, { habit_id: habitId, day: today }], () => checkIn(userId, habitId))

  // Fixing a day: +1 backdates a check-in, -1 removes one (never below 0).
  const adjust = (habitId: string, day: string, delta: 1 | -1) => delta === 1
    ? write((c) => [...c, { habit_id: habitId, day }], () => checkIn(userId, habitId, day))
    : write((c) => {
      const i = c.findIndex((x) => x.habit_id === habitId && x.day === day)
      return i < 0 ? c : c.toSpliced(i, 1)
    }, () => removeCheckIn(habitId, day))

  // Reorder: optimistic, queued behind other writes. Rewrites every active row's sort_order, so a
  // stale local copy (a reload racing a write) or a half-failed earlier write heals on the next move.
  const move = (habitId: string, delta: -1 | 1) => {
    const next = reorder(habits, habitId, delta)
    setHabits(next)
    const active = next.filter((h) => !h.archived_at).map(({ id, sort_order }) => ({ id, sort_order }))
    queue.current = queue.current.then(() => setSortOrders(active)).then(() => {}, (e) => { console.error(e); reload() })
  }

  return { habits, checkIns, today, reload, tap, adjust, move }
}
