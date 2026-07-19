import { useCallback, useEffect, useRef, useState } from 'react'
import type { SessionType, TimerSettings, Stats } from '../types'

const todayKey = () => new Date().toISOString().slice(0, 10)
const PERSIST_KEY = 'pomo-timer-state-v1'

function durationFor(type: SessionType, settings: TimerSettings) {
  if (type === 'focus') return settings.focusMin * 60
  if (type === 'shortBreak') return settings.shortBreakMin * 60
  return settings.longBreakMin * 60
}

interface PersistedTimerState {
  sessionType: SessionType
  focusCount: number
  secondsLeft: number
  endTime: number | null // epoch ms, null if paused
}

function loadPersisted(settings: TimerSettings): PersistedTimerState {
  try {
    const raw = localStorage.getItem(PERSIST_KEY)
    if (!raw) throw new Error('none')
    return JSON.parse(raw) as PersistedTimerState
  } catch {
    return { sessionType: 'focus', focusCount: 0, secondsLeft: durationFor('focus', settings), endTime: null }
  }
}

interface UseTimerArgs {
  settings: TimerSettings
  onSessionComplete: (type: SessionType) => void
  setStats: React.Dispatch<React.SetStateAction<Stats>>
  requireConfirmOnFocusComplete?: boolean
}

export function useTimer({ settings, onSessionComplete, setStats, requireConfirmOnFocusComplete }: UseTimerArgs) {
  const initial = useRef(loadPersisted(settings)).current
  // a persisted endTime already in the past means the session finished while the tab
  // was closed/backgrounded — don't resume a live countdown, and flag it so a mount
  // effect below can run completion exactly once
  const restoredRunning = initial.endTime != null && initial.endTime > Date.now()
  const restoredFinishedElsewhere = initial.endTime != null && initial.endTime <= Date.now()

  const [sessionType, setSessionType] = useState<SessionType>(initial.sessionType)
  const [focusCount, setFocusCount] = useState(initial.focusCount) // completed focus sessions this cycle
  const [running, setRunning] = useState(restoredRunning)
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (restoredRunning) return Math.max(0, Math.ceil((initial.endTime! - Date.now()) / 1000))
    if (restoredFinishedElsewhere) return 0
    return initial.secondsLeft
  })
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)

  const endTimeRef = useRef<number | null>(restoredRunning ? initial.endTime : null) // epoch ms when timer should hit 0
  const rafRef = useRef<number | null>(null)
  const sessionStartRef = useRef<Date>(new Date()) // when the current running session began, for stats' startHour

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (restoredFinishedElsewhere) handleComplete()
  }, [])

  // persist enough state to survive a refresh: session type/count always, plus either
  // the live endTime (if running) or the paused secondsLeft — never both, so a reload
  // never resumes a countdown from stale wall-clock math
  useEffect(() => {
    const state: PersistedTimerState = {
      sessionType,
      focusCount,
      secondsLeft,
      endTime: running ? endTimeRef.current : null,
    }
    try {
      localStorage.setItem(PERSIST_KEY, JSON.stringify(state))
    } catch {
      // storage full or unavailable — ignore
    }
  }, [sessionType, focusCount, secondsLeft, running])

  // keep secondsLeft accurate even if tab was backgrounded (drift-proof via Date.now)
  const tick = useCallback(() => {
    if (endTimeRef.current == null) return
    const remainingMs = endTimeRef.current - Date.now()
    const remaining = Math.max(0, Math.ceil(remainingMs / 1000))
    setSecondsLeft(remaining)
    if (remaining <= 0) {
      setRunning(false)
      endTimeRef.current = null
      handleComplete()
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (running) {
      rafRef.current = requestAnimationFrame(tick)
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [running, tick])

  // if duration settings change while idle, reset displayed duration for current session type.
  // Keyed to the duration numbers only — depending on `running` or the settings object identity
  // made pausing reset the countdown to full (settings is a fresh object every App render).
  const runningRef = useRef(running)
  runningRef.current = running
  const sessionTypeRef = useRef(sessionType)
  sessionTypeRef.current = sessionType
  useEffect(() => {
    if (!runningRef.current) {
      setSecondsLeft(durationFor(sessionTypeRef.current, settings))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.focusMin, settings.shortBreakMin, settings.longBreakMin])

  function handleComplete() {
    if (sessionType === 'focus' && requireConfirmOnFocusComplete) {
      setAwaitingConfirm(true)
      return
    }
    finishCompletion()
  }

  // advances to the next session type/auto-start, without logging a completed session
  function advance() {
    if (sessionType === 'focus') {
      const nextCount = focusCount + 1
      setFocusCount(nextCount)
      const isLongBreak = nextCount % settings.longBreakInterval === 0
      const next: SessionType = isLongBreak ? 'longBreak' : 'shortBreak'
      setSessionType(next)
      setSecondsLeft(durationFor(next, settings))
      if (settings.autoStartBreaks) start(next, settings)
    } else {
      setSessionType('focus')
      setSecondsLeft(durationFor('focus', settings))
      if (settings.autoStartFocus) start('focus', settings)
    }
  }

  // called when a session actually finishes its full duration (or user confirms presence)
  function finishCompletion() {
    onSessionComplete(sessionType)
    if (sessionType === 'focus') {
      const start = sessionStartRef.current
      setStats((prev) => ({
        ...prev,
        sessions: [
          ...(prev.sessions ?? []),
          { date: todayKey(), startHour: start.getHours(), durationSec: settings.focusMin * 60 },
        ],
      }))
    }
    advance()
  }

  function start(type?: SessionType, s?: TimerSettings) {
    const useType = type ?? sessionType
    const useSettings = s ?? settings
    const secs = secondsLeft > 0 && (type ?? sessionType) === sessionType ? secondsLeft : durationFor(useType, useSettings)
    sessionStartRef.current = new Date()
    endTimeRef.current = Date.now() + secs * 1000
    setRunning(true)
  }

  function pause() {
    if (endTimeRef.current != null) {
      const remainingMs = endTimeRef.current - Date.now()
      setSecondsLeft(Math.max(0, Math.ceil(remainingMs / 1000)))
    }
    endTimeRef.current = null
    setRunning(false)
  }

  function reset() {
    endTimeRef.current = null
    setRunning(false)
    setSecondsLeft(durationFor(sessionType, settings))
  }

  // user-initiated skip: never counts as a completed session, no stat logged
  function skip() {
    endTimeRef.current = null
    setRunning(false)
    advance()
  }

  function switchType(type: SessionType) {
    endTimeRef.current = null
    setRunning(false)
    setAwaitingConfirm(false)
    setSessionType(type)
    setSecondsLeft(durationFor(type, settings))
  }

  // user confirmed they're present: log the session and advance normally
  function confirmPresence() {
    setAwaitingConfirm(false)
    finishCompletion()
  }

  // user never responded: discard the session, don't log it, reset to a fresh focus timer
  function discardSession() {
    setAwaitingConfirm(false)
    setSessionType('focus')
    setSecondsLeft(durationFor('focus', settings))
  }

  return {
    sessionType,
    secondsLeft,
    running,
    focusCount,
    awaitingConfirm,
    totalSeconds: durationFor(sessionType, settings),
    start: () => start(),
    pause,
    reset,
    skip,
    switchType,
    confirmPresence,
    discardSession,
  }
}
