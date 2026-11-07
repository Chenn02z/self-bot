// Run: node src/features/habits/stats.check.ts
/// <reference types="node" />
import assert from 'node:assert/strict'
import { habitStats, reorder } from './stats.ts'

const habit = (id: string, target: number, archived_at: string | null = null) => ({ id, target, archived_at })
const taps = (habit_id: string, day: string, n: number) => Array.from({ length: n }, () => ({ habit_id, day }))
const today = '2026-11-07'

const water = habit('water', 8)
const read = habit('read', 1)
const s = habitStats([water, read], [...taps('water', today, 3), ...taps('water', '2026-11-06', 8)], today)
assert.deepEqual(s.habits.map((h) => [h.habit.id, h.count, h.done]), [['water', 3, false], ['read', 0, false]])

// done at target, over-target keeps counting, archived habits drop out of the list and done/total
const t = habitStats(
  [water, read, habit('old', 1, '2026-11-01T00:00:00Z')],
  [...taps('water', today, 9), ...taps('old', today, 1)],
  today,
)
assert.deepEqual(t.habits.map((h) => [h.habit.id, h.count, h.done]), [['water', 9, true], ['read', 0, false]])
assert.deepEqual([t.done, t.total], [1, 2])
assert.deepEqual([s.done, s.total], [0, 2])

// Streak: alive mid-day before today is done (counts through yesterday), then today joins once done
const streakOf = (checkIns: { habit_id: string; day: string }[]) =>
  habitStats([read], checkIns, today).habits[0].streak
const before = [...taps('read', '2026-11-04', 1), ...taps('read', '2026-11-05', 1), ...taps('read', '2026-11-06', 1)]
assert.equal(streakOf(before), 3)
assert.equal(streakOf([...before, ...taps('read', today, 1)]), 4)
assert.equal(streakOf([]), 0)

// Broken by a missed yesterday: older days no longer count, today alone restarts it
const gap = [...taps('read', '2026-11-04', 1), ...taps('read', '2026-11-05', 1)]
assert.equal(streakOf(gap), 0)
assert.equal(streakOf([...gap, ...taps('read', today, 1)]), 1)
// a day short of target breaks it too
const waterStreak = (c: { habit_id: string; day: string }[]) => habitStats([water], c, today).habits[0].streak
assert.equal(waterStreak([...taps('water', '2026-11-05', 8), ...taps('water', '2026-11-06', 7)]), 0)

// Backdated check-in for the missed day reconnects the streak
assert.equal(streakOf([...gap, ...taps('read', '2026-11-06', 1), ...taps('read', today, 1)]), 4)
// across a month boundary
assert.equal(habitStats([read], [...taps('read', '2026-10-31', 1), ...taps('read', '2026-11-01', 1)], '2026-11-01').habits[0].streak, 2)

// 7-day dots: oldest first, ending today; done per day against target; older days ignored
const week = habitStats([water], [...taps('water', '2026-10-31', 8), ...taps('water', '2026-11-01', 8),
  ...taps('water', '2026-11-03', 2), ...taps('water', '2026-11-06', 9), ...taps('water', today, 8)], today).habits[0].week
assert.deepEqual(week.map((d) => [d.day, d.count, d.done]), [
  ['2026-11-01', 8, true], ['2026-11-02', 0, false], ['2026-11-03', 2, false], ['2026-11-04', 0, false],
  ['2026-11-05', 0, false], ['2026-11-06', 9, true], ['2026-11-07', 8, true],
])

// Reorder: moves among active habits only, renumbers them 0..n-1 (ties from the default 0 resolve),
// archived habits keep their place untouched; moving past either end is a no-op.
const h = (id: string, sort_order: number, archived_at: string | null = null) => ({ id, target: 1, sort_order, archived_at })
const list = [h('a', 0), h('b', 0), h('gone', 1, '2026-11-01T00:00:00Z'), h('c', 0)]
const order = (l: { id: string; sort_order: number }[]) => l.map((x) => `${x.id}:${x.sort_order}`)
assert.deepEqual(order(reorder(list, 'c', -1)), ['a:0', 'c:1', 'b:2', 'gone:1'])
assert.deepEqual(order(reorder(list, 'a', 1)), ['b:0', 'a:1', 'c:2', 'gone:1'])
assert.deepEqual(order(reorder(list, 'a', -1)), ['a:0', 'b:1', 'c:2', 'gone:1'])
assert.deepEqual(order(reorder(list, 'c', 1)), ['a:0', 'b:1', 'c:2', 'gone:1'])

console.log('habit stats ok')
