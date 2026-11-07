import { useCallback, useEffect, useState } from 'react'
import { checkIn, listCheckIns, listHabits } from '../lib/api'
import { sgtToday } from '../lib/dates'
import type { CheckIn, Habit } from '../lib/supabase'

// Habits plus today's check-ins, refreshed whenever the app comes back to the foreground.
export function useHabits(userId: string) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [today, setToday] = useState(sgtToday)

  const reload = useCallback(() => {
    const day = sgtToday()
    Promise.all([listHabits(), listCheckIns(day)])
      .then(([h, c]) => { setHabits(h); setCheckIns(c); setToday(day) }, console.error)
  }, [])

  useEffect(() => {
    reload()
    const onVisible = () => { if (document.visibilityState === 'visible') reload() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reload])

  // Count goes up on tap; a failed write resyncs from the server.
  // Past SGT midnight since the last load, the screen shows a stale day: write, then reload.
  const tap = (habitId: string) => {
    if (sgtToday() !== today) return void checkIn(userId, habitId).catch(console.error).finally(reload)
    setCheckIns((c) => [...c, { habit_id: habitId, day: today }])
    checkIn(userId, habitId).catch((e) => { console.error(e); reload() })
  }

  return { habits, checkIns, today, reload, tap }
}
