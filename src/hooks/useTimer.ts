import { useCallback, useEffect, useRef, useState } from 'react'
import type { SessionType, TimerSettings, Stats } from '../types'

const todayKey = () => new Date().toISOString().slice(0, 10)

function durationFor(type: SessionType, settings: TimerSettings) {
  if (type === 'focus') return settings.focusMin * 60
  if (type === 'shortBreak') return settings.shortBreakMin * 60
  return settings.longBreakMin * 60
}

interface UseTimerArgs {
  settings: TimerSettings
  onSessionComplete: (type: SessionType) => void
  setStats: React.Dispatch<React.SetStateAction<Stats>>
  requireConfirmOnFocusComplete?: boolean
}

export function useTimer({ settings, onSessionComplete, setStats, requireConfirmOnFocusComplete }: UseTimerArgs) {
  const [sessionType, setSessionType] = useState<SessionType>('focus')
  const [focusCount, setFocusCount] = useState(0) // completed focus sessions this cycle
  const [running, setRunning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(() => durationFor('focus', settings))
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)

  const endTimeRef = useRef<number | null>(null) // epoch ms when timer should hit 0
  const rafRef = useRef<number | null>(null)

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

  // called directly by skip/break completions, or after user confirms presence
  function finishCompletion() {
    onSessionComplete(sessionType)

    if (sessionType === 'focus') {
      setStats((prev) => ({
        byDay: { ...prev.byDay, [todayKey()]: (prev.byDay[todayKey()] ?? 0) + 1 },
      }))
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

  function start(type?: SessionType, s?: TimerSettings) {
    const useType = type ?? sessionType
    const useSettings = s ?? settings
    const secs = secondsLeft > 0 && (type ?? sessionType) === sessionType ? secondsLeft : durationFor(useType, useSettings)
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

  function skip() {
    endTimeRef.current = null
    setRunning(false)
    finishCompletion()
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
