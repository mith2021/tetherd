export type SessionType = 'focus' | 'shortBreak' | 'longBreak'

export interface TimerSettings {
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  longBreakInterval: number // focus sessions before long break
  autoStartBreaks: boolean
  autoStartFocus: boolean
  pauseOnTabAway: boolean
  confirmPresenceOnComplete: boolean
  presenceGraceSeconds: number
}

export interface Task {
  id: string
  title: string
  targetPomodoros: number
  completedPomodoros: number
  done: boolean
}

export interface BackgroundOption {
  id: string
  name: string
  kind: 'color' | 'gradient' | 'image' | 'gif' | 'custom' | 'video'
  value: string // css gradient/color, or data URL for uploaded media
}

export interface ThemeSettings {
  backgroundId: string
  accentColor: string
  fontFamily: string
  backgroundPosition: { x: number; y: number } // percent, 0-100
  overlayOpacity: number // 0-100, darkness over background
  glassIntensity: number // 0-100, drives glass blur + surface alpha (50 = original look)
  timerFont: string // id from src/fonts.ts
  showTasks: boolean
  showSessionPills: boolean
  showStatsChip: boolean
  showMediaButtons: boolean // music + spotify + pip header buttons
}

export interface Stats {
  // date string YYYY-MM-DD -> focus sessions completed
  byDay: Record<string, number>
}
