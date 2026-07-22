import type { Stats, Task, ThemeSettings, TimerSettings } from '../types'

const BACKUP_KEYS = ['pomo-stats', 'pomo-tasks', 'pomo-settings', 'pomo-theme'] as const

export interface BackupPayload {
  stats: Stats
  tasks: Task[]
  settings: TimerSettings
  theme: ThemeSettings
}

// Keys are only written to localStorage on the first state change (see useLocalStorage),
// so a key can legitimately be absent even in an app that's been used — fall back to the
// same defaults App.tsx uses rather than omitting the field, which would fail validation
// on import.
const DEFAULTS: BackupPayload = {
  stats: { sessions: [], tasksCompletedByDay: {} },
  tasks: [],
  settings: {
    focusMin: 25,
    shortBreakMin: 5,
    longBreakMin: 15,
    longBreakInterval: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
    pauseOnTabAway: false,
    confirmPresenceOnComplete: false,
    presenceGraceSeconds: 120,
    webcamPresenceEnabled: false,
    webcamAwaySeconds: 15,
  },
  theme: {
    backgroundId: 'default',
    accentColor: '#f97316',
    fontFamily: 'system-ui',
  } as ThemeSettings,
}

export function exportBackup() {
  const payload: Partial<Record<(typeof BACKUP_KEYS)[number], unknown>> = {}
  for (const key of BACKUP_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw) payload[key] = JSON.parse(raw)
  }

  const json = JSON.stringify(
    {
      stats: payload['pomo-stats'] ?? DEFAULTS.stats,
      tasks: payload['pomo-tasks'] ?? DEFAULTS.tasks,
      settings: payload['pomo-settings'] ?? DEFAULTS.settings,
      theme: payload['pomo-theme'] ?? DEFAULTS.theme,
    },
    null,
    2,
  )

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `pomodoro-backup-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function isStats(v: unknown): v is Stats {
  return (
    !!v &&
    typeof v === 'object' &&
    Array.isArray((v as Stats).sessions) &&
    typeof (v as Stats).tasksCompletedByDay === 'object' &&
    (v as Stats).tasksCompletedByDay !== null
  )
}

function isTasks(v: unknown): v is Task[] {
  return (
    Array.isArray(v) &&
    v.every(
      (t) =>
        t &&
        typeof t === 'object' &&
        typeof t.id === 'string' &&
        typeof t.title === 'string' &&
        typeof t.targetPomodoros === 'number' &&
        typeof t.completedPomodoros === 'number' &&
        typeof t.done === 'boolean',
    )
  )
}

function isSettings(v: unknown): v is TimerSettings {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as TimerSettings).focusMin === 'number' &&
    typeof (v as TimerSettings).shortBreakMin === 'number' &&
    typeof (v as TimerSettings).longBreakMin === 'number'
  )
}

function isTheme(v: unknown): v is ThemeSettings {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as ThemeSettings).backgroundId === 'string' &&
    typeof (v as ThemeSettings).accentColor === 'string'
  )
}

// Validates the full shape before writing anything, so a malformed file never
// partially applies (e.g. valid tasks but corrupted stats).
export function parseBackup(json: string): BackupPayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('That file is not a valid backup.')
  }

  const { stats, tasks, settings, theme } = parsed as Record<string, unknown>

  if (!isStats(stats)) throw new Error('Backup is missing valid stats data.')
  if (!isTasks(tasks)) throw new Error('Backup is missing valid tasks data.')
  if (!isSettings(settings)) throw new Error('Backup is missing valid settings data.')
  if (!isTheme(theme)) throw new Error('Backup is missing valid theme data.')

  return { stats, tasks, settings, theme }
}

export function applyBackup(payload: BackupPayload) {
  localStorage.setItem('pomo-stats', JSON.stringify(payload.stats))
  localStorage.setItem('pomo-tasks', JSON.stringify(payload.tasks))
  localStorage.setItem('pomo-settings', JSON.stringify(payload.settings))
  localStorage.setItem('pomo-theme', JSON.stringify(payload.theme))
}
