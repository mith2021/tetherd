import type { Stats, Task, ThemeSettings, TimerSettings } from '../types'
import type { WidgetLayout, WidgetSizes, SavedLayout } from '../hooks/useWidgetLayout'

const BACKUP_KEYS = [
  'pomo-stats',
  'pomo-tasks',
  'pomo-settings',
  'pomo-theme',
  'pomo-widget-layout-v2',
  'pomo-widget-sizes-v1',
  'pomo-saved-layouts',
  'pomo-widget-minimized-v1',
  'pomo-widget-tints-v1',
] as const

export interface BackupPayload {
  stats: Stats
  tasks: Task[]
  settings: TimerSettings
  theme: ThemeSettings
  widgetLayout: WidgetLayout
  widgetSizes: WidgetSizes
  savedLayouts: Record<string, SavedLayout>
  widgetMinimized: Record<string, boolean>
  widgetTints: Record<string, string | null>
}

// Keys are only written to localStorage on the first state change (see useLocalStorage),
// so a key can legitimately be absent even in an app that's been used — fall back to the
// same defaults App.tsx/useWidgetLayout.ts use rather than omitting the field, which would
// fail validation on import. The widget-layout keys default to {} rather than App's
// per-widget-id null map — useWidgetLayout treats a missing id as null/flow-layout anyway,
// so an empty object round-trips to the same visual result without this file needing to
// know the app's current widget id list.
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
    dailyGoalSessions: 0,
  },
  theme: {
    backgroundId: 'default',
    accentColor: '#f97316',
    fontFamily: 'system-ui',
  } as ThemeSettings,
  widgetLayout: {},
  widgetSizes: {},
  savedLayouts: {},
  widgetMinimized: {},
  widgetTints: {},
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
      widgetLayout: payload['pomo-widget-layout-v2'] ?? DEFAULTS.widgetLayout,
      widgetSizes: payload['pomo-widget-sizes-v1'] ?? DEFAULTS.widgetSizes,
      savedLayouts: payload['pomo-saved-layouts'] ?? DEFAULTS.savedLayouts,
      widgetMinimized: payload['pomo-widget-minimized-v1'] ?? DEFAULTS.widgetMinimized,
      widgetTints: payload['pomo-widget-tints-v1'] ?? DEFAULTS.widgetTints,
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

// Widget layout/sizes/saved-layouts/minimized-state are all plain Record<string, ...>
// keyed by widget id — the set of ids can change as the app evolves, so validation only
// checks "is a plain object", not specific keys. A missing/malformed value here isn't
// fatal to the rest of the import; it degrades to the default (flow layout) instead of
// rejecting the whole backup, since layout is cosmetic and shouldn't block restoring
// stats/tasks/settings/theme.
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
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

  const { stats, tasks, settings, theme, widgetLayout, widgetSizes, savedLayouts, widgetMinimized, widgetTints } =
    parsed as Record<string, unknown>

  if (!isStats(stats)) throw new Error('Backup is missing valid stats data.')
  if (!isTasks(tasks)) throw new Error('Backup is missing valid tasks data.')
  if (!isSettings(settings)) throw new Error('Backup is missing valid settings data.')
  if (!isTheme(theme)) throw new Error('Backup is missing valid theme data.')

  return {
    stats,
    tasks,
    settings,
    theme,
    widgetLayout: isPlainObject(widgetLayout) ? (widgetLayout as WidgetLayout) : DEFAULTS.widgetLayout,
    widgetSizes: isPlainObject(widgetSizes) ? (widgetSizes as WidgetSizes) : DEFAULTS.widgetSizes,
    savedLayouts: isPlainObject(savedLayouts) ? (savedLayouts as Record<string, SavedLayout>) : DEFAULTS.savedLayouts,
    widgetMinimized: isPlainObject(widgetMinimized)
      ? (widgetMinimized as Record<string, boolean>)
      : DEFAULTS.widgetMinimized,
    widgetTints: isPlainObject(widgetTints) ? (widgetTints as Record<string, string | null>) : DEFAULTS.widgetTints,
  }
}

export function applyBackup(payload: BackupPayload) {
  localStorage.setItem('pomo-stats', JSON.stringify(payload.stats))
  localStorage.setItem('pomo-tasks', JSON.stringify(payload.tasks))
  localStorage.setItem('pomo-settings', JSON.stringify(payload.settings))
  localStorage.setItem('pomo-theme', JSON.stringify(payload.theme))
  localStorage.setItem('pomo-widget-layout-v2', JSON.stringify(payload.widgetLayout))
  localStorage.setItem('pomo-widget-sizes-v1', JSON.stringify(payload.widgetSizes))
  localStorage.setItem('pomo-saved-layouts', JSON.stringify(payload.savedLayouts))
  localStorage.setItem('pomo-widget-minimized-v1', JSON.stringify(payload.widgetMinimized))
  localStorage.setItem('pomo-widget-tints-v1', JSON.stringify(payload.widgetTints))
}
