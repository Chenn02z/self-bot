// Run: node src/features/habits/stats.check.ts
/// <reference types="node" />
import assert from 'node:assert/strict'
import { habitStats } from './stats.ts'

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

console.log('habit stats ok')
