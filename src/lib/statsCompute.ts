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

export function focusScoreStars(sessionsToday: number, goal: number) {
  if (goal <= 0) return 0
  return Math.min(5, Math.round((sessionsToday / goal) * 5))
}

export function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function formatMinutes(totalSeconds: number) {
  return `${Math.floor(totalSeconds / 60)}m`
}
