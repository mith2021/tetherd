import type { SessionRecord } from '../types'

export function sessionsInRange(sessions: SessionRecord[], startDate: string, endDate: string) {
  return sessions.filter((s) => s.date >= startDate && s.date <= endDate)
}

export function totalFocusedSeconds(sessions: SessionRecord[]) {
  return sessions.reduce((sum, s) => sum + s.durationSec, 0)
}

export function bestSessionSeconds(sessions: SessionRecord[]) {
  return sessions.reduce((max, s) => Math.max(max, s.durationSec), 0)
}

// minutes focused per hour-of-day (0-23) for a single date
export function hourlyBuckets(sessions: SessionRecord[], date: string) {
  const buckets = new Array(24).fill(0) as number[]
  for (const s of sessions) {
    if (s.date !== date) continue
    buckets[s.startHour] += s.durationSec / 60
  }
  return buckets
}

// consecutive days (ending today or yesterday — a day not yet started doesn't break it)
// with at least one completed focus session, and the longest such run ever.
// Dates are compared as YYYY-MM-DD strings produced the same way SessionRecord.date is
// (new Date().toISOString().slice(0,10), see useTimer's todayKey) — NOT via setHours(0,0,0,0)
// then toISOString, which silently shifts to the previous day in negative-UTC-offset zones.
export function calculateStreaks(sessions: SessionRecord[]) {
  const days = new Set(sessions.map((s) => s.date))
  if (days.size === 0) return { current: 0, longest: 0 }

  const toKey = (d: Date) => d.toISOString().slice(0, 10)
  const todayKey = toKey(new Date())

  // walk backwards from today's UTC date, one calendar day at a time, using the
  // canonical string key at each step (never re-deriving from a local Date's midnight)
  function addDays(key: string, delta: number) {
    const d = new Date(`${key}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + delta)
    return toKey(d)
  }

  let current = 0
  let cursorKey = todayKey
  // today itself doesn't have to have a session yet for the streak to still be "alive"
  if (!days.has(cursorKey)) cursorKey = addDays(cursorKey, -1)
  while (days.has(cursorKey)) {
    current++
    cursorKey = addDays(cursorKey, -1)
  }

  const sortedDays = [...days].sort()
  let longest = 0
  let run = 0
  let prev: Date | null = null
  for (const key of sortedDays) {
    const d = new Date(key)
    if (prev) {
      const diffDays = Math.round((d.getTime() - prev.getTime()) / 86400000)
      run = diffDays === 1 ? run + 1 : 1
    } else {
      run = 1
    }
    longest = Math.max(longest, run)
    prev = d
  }

  return { current, longest: Math.max(longest, current) }
}

export function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function formatMinutes(totalSeconds: number) {
  return `${Math.floor(totalSeconds / 60)}m`
}
