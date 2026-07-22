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
  activeTaskTitle?: string | null
}

export function useTimer({
  settings,
  onSessionComplete,
  setStats,
  requireConfirmOnFocusComplete,
  activeTaskTitle,
}: UseTimerArgs) {
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
  // never resumes a countdown from stale wall-clock math.
  // Called synchronously (not via useEffect) from every mutator below, with the new
  // values passed explicitly — an effect keyed to state fires a tick late (after
  // React commits) and can lose the write if a reload/close races it, which is what
  // silently dropped 2 completed focus sessions before this fix.
  function persistNow(state: PersistedTimerState) {
    try {
      localStorage.setItem(PERSIST_KEY, JSON.stringify(state))
    } catch {
      // storage full or unavailable — ignore
    }
  }

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
  // Compares against the last-seen values (not a fire-once flag) so it only resets on an actual
  // change — a fire-once ref breaks under StrictMode's dev double-invoke, which runs this effect's
  // "first" pass twice and would still clobber a restored/quick-added secondsLeft on mount.
  const runningRef = useRef(running)
  runningRef.current = running
  const sessionTypeRef = useRef(sessionType)
  sessionTypeRef.current = sessionType
  // read via .current (not closed over) so a completion reached through the tick() rAF
  // loop — whose closure is frozen from an earlier render — still sees the task that was
  // active when the session actually finished, not whichever task was active on mount.
  const activeTaskTitleRef = useRef(activeTaskTitle)
  activeTaskTitleRef.current = activeTaskTitle
  const lastDurations = useRef([settings.focusMin, settings.shortBreakMin, settings.longBreakMin])
  useEffect(() => {
    const current: [number, number, number] = [settings.focusMin, settings.shortBreakMin, settings.longBreakMin]
    const changed = current.some((v, i) => v !== lastDurations.current[i])
    lastDurations.current = current
    if (!changed) return
    if (!runningRef.current) {
      const secs = durationFor(sessionTypeRef.current, settings)
      setSecondsLeft(secs)
      persistNow({ sessionType: sessionTypeRef.current, focusCount, secondsLeft: secs, endTime: null })
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
      const secs = durationFor(next, settings)
      setSessionType(next)
      setSecondsLeft(secs)
      if (settings.autoStartBreaks) {
        start(next, settings)
      } else {
        persistNow({ sessionType: next, focusCount: nextCount, secondsLeft: secs, endTime: null })
      }
    } else {
      const secs = durationFor('focus', settings)
      setSessionType('focus')
      setSecondsLeft(secs)
      if (settings.autoStartFocus) {
        start('focus', settings)
      } else {
        persistNow({ sessionType: 'focus', focusCount, secondsLeft: secs, endTime: null })
      }
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
          {
            date: todayKey(),
            startHour: start.getHours(),
            durationSec: settings.focusMin * 60,
            ...(activeTaskTitleRef.current ? { taskTitle: activeTaskTitleRef.current } : {}),
          },
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
    setSessionType(useType)
    setRunning(true)
    persistNow({ sessionType: useType, focusCount, secondsLeft: secs, endTime: endTimeRef.current })
  }

  function pause() {
    let secs = secondsLeft
    if (endTimeRef.current != null) {
      const remainingMs = endTimeRef.current - Date.now()
      secs = Math.max(0, Math.ceil(remainingMs / 1000))
      setSecondsLeft(secs)
    }
    endTimeRef.current = null
    setRunning(false)
    persistNow({ sessionType, focusCount, secondsLeft: secs, endTime: null })
  }

  function reset() {
    const secs = durationFor(sessionType, settings)
    endTimeRef.current = null
    setRunning(false)
    setSecondsLeft(secs)
    persistNow({ sessionType, focusCount, secondsLeft: secs, endTime: null })
  }

  // user-initiated skip: never counts as a completed session, no stat logged
  function skip() {
    endTimeRef.current = null
    setRunning(false)
    advance()
  }

  // quick +N min: shifts the live endTime if running, else just bumps the paused display
  function addMinutes(minutes: number) {
    const deltaMs = minutes * 60 * 1000
    if (running && endTimeRef.current != null) {
      endTimeRef.current += deltaMs
      const secs = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
      setSecondsLeft(secs)
      persistNow({ sessionType, focusCount, secondsLeft: secs, endTime: endTimeRef.current })
    } else {
      const secs = Math.max(0, secondsLeft + minutes * 60)
      setSecondsLeft(secs)
      persistNow({ sessionType, focusCount, secondsLeft: secs, endTime: null })
    }
  }

  function switchType(type: SessionType) {
    const secs = durationFor(type, settings)
    endTimeRef.current = null
    setRunning(false)
    setAwaitingConfirm(false)
    setSessionType(type)
    setSecondsLeft(secs)
    persistNow({ sessionType: type, focusCount, secondsLeft: secs, endTime: null })
  }

  // user confirmed they're present: log the session and advance normally
  function confirmPresence() {
    setAwaitingConfirm(false)
    finishCompletion()
  }

  // user never responded: discard the session, don't log it, reset to a fresh focus timer
  function discardSession() {
    const secs = durationFor('focus', settings)
    setAwaitingConfirm(false)
    setSessionType('focus')
    setSecondsLeft(secs)
    persistNow({ sessionType: 'focus', focusCount, secondsLeft: secs, endTime: null })
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
    addMinutes,
    switchType,
    confirmPresence,
    discardSession,
  }
}
