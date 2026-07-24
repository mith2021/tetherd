import { useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react'
import { createPortal } from 'react-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTimer } from './hooks/useTimer'
import { useBackgroundMedia } from './hooks/useBackgroundMedia'
import { useWidgetLayout } from './hooks/useWidgetLayout'
import { usePictureInPicture, isPiPSupported } from './hooks/usePictureInPicture'
import { usePresenceDetection } from './hooks/usePresenceDetection'
import { useMilestoneToast } from './hooks/useMilestoneToast'
import { calculateStreaks } from './lib/statsCompute'
import { TimerDisplay } from './components/TimerDisplay'
import { TaskList } from './components/TaskList'
import { DraggableWidget } from './components/DraggableWidget'
import { PresenceCheckModal } from './components/PresenceCheckModal'
import { PipTimerView } from './components/PipTimerView'
import { LayoutsMenu } from './components/LayoutsMenu'
import { Button } from '@/components/ui/button'
import { PRESET_BACKGROUNDS } from './backgrounds'
import { fontFamilyFor } from './fonts'
import { playAlertBeep, playPauseSound, playResetSound, playStartSound } from './lib/sounds'
import { notifySessionComplete } from './lib/notify'
import { hexToRgba } from './lib/utils'
import { FOCUS_QUOTES } from './quotes'
import type { BackgroundOption, SessionType, Stats, Task, ThemeSettings, TimerSettings } from './types'

const AmbientMixer = lazy(() => import('./components/AmbientMixer').then((m) => ({ default: m.AmbientMixer })))
const SpotifyEmbed = lazy(() => import('./components/SpotifyEmbed').then((m) => ({ default: m.SpotifyEmbed })))
const StatsDialog = lazy(() => import('./components/StatsDialog').then((m) => ({ default: m.StatsDialog })))
const TimerMenu = lazy(() => import('./components/TimerMenu').then((m) => ({ default: m.TimerMenu })))
const BackgroundMenu = lazy(() => import('./components/BackgroundMenu').then((m) => ({ default: m.BackgroundMenu })))
const AppMenu = lazy(() => import('./components/AppMenu').then((m) => ({ default: m.AppMenu })))

function DragHandle() {
  return (
    <div className="flex justify-center items-center w-full h-6 -mt-1 mb-1 cursor-grab opacity-40 hover:opacity-80 transition">
      <svg width="28" height="10" viewBox="0 0 28 10" fill="currentColor" className="text-white">
        <circle cx="4" cy="5" r="1.5" />
        <circle cx="10" cy="5" r="1.5" />
        <circle cx="16" cy="5" r="1.5" />
        <circle cx="22" cy="5" r="1.5" />
      </svg>
    </div>
  )
}

const DEFAULT_SETTINGS: TimerSettings = {
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
}

const DEFAULT_THEME: ThemeSettings = {
  backgroundId: PRESET_BACKGROUNDS[0].id,
  accentColor: '#f97316',
  fontFamily: 'system-ui',
  backgroundPosition: { x: 50, y: 50 },
  overlayOpacity: 30,
  glassIntensity: 50,
  timerFont: 'space-grotesk',
  showTasks: true,
  showSessionPills: true,
  showStatsChip: true,
  showMediaButtons: true,
  showQuotes: true,
}

function App() {
  const [settingsRaw, setSettings] = useLocalStorage<TimerSettings>('pomo-settings', DEFAULT_SETTINGS)
  const settings: TimerSettings = { ...DEFAULT_SETTINGS, ...settingsRaw }
  const [themeRaw, setThemeRaw] = useLocalStorage<ThemeSettings>('pomo-theme', DEFAULT_THEME)
  const theme: ThemeSettings = { ...DEFAULT_THEME, ...themeRaw }
  const [themeByBackground, setThemeByBackground] = useLocalStorage<Record<string, ThemeSettings>>(
    'pomo-theme-by-bg',
    {}
  )
  // kept in sync every render so the switch handler below always reads the latest
  // saved-snapshot map, never a stale render's closure (setThemeByBackground's own
  // updater fires async/batched, so the write on a background switch can't be read
  // back synchronously in the same call)
  const themeByBackgroundRef = useRef(themeByBackground)
  themeByBackgroundRef.current = themeByBackground
  // visual settings (accent, glass, overlay, font, toggles) are remembered per background —
  // switching away snapshots the outgoing (default-merged) theme under its backgroundId,
  // switching to a background with a saved snapshot restores it, and a never-seen
  // background just keeps whatever's currently on screen as its starting point
  const setTheme: React.Dispatch<React.SetStateAction<ThemeSettings>> = (next) => {
    setThemeRaw((prevRaw) => {
      const prev: ThemeSettings = { ...DEFAULT_THEME, ...prevRaw }
      const resolved = typeof next === 'function' ? (next as (p: ThemeSettings) => ThemeSettings)(prev) : next
      if (resolved.backgroundId !== prev.backgroundId) {
        const saved = themeByBackgroundRef.current[resolved.backgroundId]
        setThemeByBackground((byBg) => ({ ...byBg, [prev.backgroundId]: prev }))
        return saved ? { ...saved, backgroundId: resolved.backgroundId } : resolved
      }
      return resolved
    })
  }
  const [customBackgrounds, setCustomBackgrounds] = useLocalStorage<BackgroundOption[]>('pomo-custom-bgs', [])
  const [tasks, setTasks] = useLocalStorage<Task[]>('pomo-tasks', [])
  const [activeTaskId, setActiveTaskId] = useLocalStorage<string | null>('pomo-active-task', null)
  const [statsRaw, setStats] = useLocalStorage<Stats>('pomo-stats', { sessions: [], tasksCompletedByDay: {} })
  // old schema stored { byDay: Record<date, count> } — synthesize one noon-hour
  // session per count so the heatmap keeps its history after the sessions-log migration
  const stats: Stats = useMemo(() => {
    if (Array.isArray(statsRaw.sessions)) {
      return { sessions: statsRaw.sessions, tasksCompletedByDay: statsRaw.tasksCompletedByDay ?? {} }
    }
    const legacyByDay = (statsRaw as unknown as { byDay?: Record<string, number> }).byDay ?? {}
    const sessions = Object.entries(legacyByDay).flatMap(([date, count]) =>
      Array.from({ length: count }, () => ({ date, startHour: 12, durationSec: settings.focusMin * 60 }))
    )
    return { sessions, tasksCompletedByDay: {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsRaw])

  const mediaUrls = useBackgroundMedia(customBackgrounds)

  const {
    layout,
    sizes,
    minimized,
    toggleMinimized,
    setPosition,
    setSize,
    resetLayout,
    isCustomized,
    savedLayouts,
    saveLayoutAs,
    applyLayout,
    deleteLayout,
    tints,
    setTint,
  } = useWidgetLayout(['timer', 'tasks'])
  const pip = usePictureInPicture()

  // minimizing a flow-layout widget shrinks main's scrollHeight, but the browser
  // keeps the old scrollTop — leaving the view stuck mid-scroll showing a sliver
  // of clipped content until the user manually scrolls. Clamp it back in bounds
  // whenever a widget's minimized state changes.
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    el.scrollTop = Math.min(el.scrollTop, el.scrollHeight - el.clientHeight)
  }, [minimized.timer, minimized.tasks])

  // stale service-worker cache otherwise requires a manual hard-reload to pick up
  // a new deploy — surface it instead so users aren't stuck on a fixed-but-invisible bug
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  function handleSessionComplete(type: SessionType) {
    playAlertBeep()
    if (type === 'focus' && activeTaskId) {
      setTasks((prev) =>
        prev.map((t) => (t.id === activeTaskId ? { ...t, completedPomodoros: t.completedPomodoros + 1 } : t))
      )
    }
    document.title = 'Session complete! — Tetherd'
    setTimeout(() => {
      if (document.title.startsWith('Session complete')) document.title = 'Tetherd'
    }, 4000)
  }

  const activeTask = tasks.find((t) => t.id === activeTaskId)

  const timer = useTimer({
    settings,
    onSessionComplete: handleSessionComplete,
    setStats,
    requireConfirmOnFocusComplete: settings.confirmPresenceOnComplete,
    activeTaskTitle: activeTask?.title ?? null,
  })

  useEffect(() => {
    if (timer.awaitingConfirm) notifySessionComplete()
  }, [timer.awaitingConfirm])

  // presence detection auto-pauses the timer when the face is lost, which would
  // otherwise flip `timer.running` false and tear the camera down before it can
  // ever see the user come back — keep it active through an auto-pause it caused
  const awaitingReturnRef = useRef(false)
  useEffect(() => {
    if (timer.running || timer.sessionType !== 'focus') awaitingReturnRef.current = false
  }, [timer.running, timer.sessionType])
  const presence = usePresenceDetection({
    enabled: settings.webcamPresenceEnabled,
    active: (timer.running || awaitingReturnRef.current) && timer.sessionType === 'focus',
    awayGraceSeconds: settings.webcamAwaySeconds,
    onFaceLost: () => {
      playPauseSound()
      awaitingReturnRef.current = true
      timer.pause()
    },
    onFacePresent: () => {
      playStartSound()
      awaitingReturnRef.current = false
      timer.start()
    },
  })

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[role="dialog"], [role="slider"]')
      if (isTyping || timer.awaitingConfirm) return

      if (e.code === 'Space') {
        e.preventDefault()
        if (timer.running) {
          playPauseSound()
          timer.pause()
        } else {
          playStartSound()
          timer.start()
        }
      } else if (e.key === 'r' || e.key === 'R') {
        playResetSound()
        timer.reset()
      } else if (e.key === 's' || e.key === 'S') {
        timer.skip()
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [timer.running, timer.awaitingConfirm, timer.start, timer.pause, timer.reset, timer.skip])

  useEffect(() => {
    if (!settings.pauseOnTabAway) return
    function handleVisibility() {
      if (document.hidden && timer.running && timer.sessionType === 'focus') {
        timer.pause()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [settings.pauseOnTabAway, timer.running, timer.sessionType, timer.pause])

  useEffect(() => {
    const mins = Math.floor(timer.secondsLeft / 60)
    const secs = timer.secondsLeft % 60
    const label = timer.sessionType === 'focus' ? 'Focus' : timer.sessionType === 'shortBreak' ? 'Break' : 'Long Break'
    document.title = timer.running
      ? `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} — ${label}`
      : 'Tetherd'
  }, [timer.secondsLeft, timer.running, timer.sessionType])

  const allBackgrounds = useMemo(() => [...PRESET_BACKGROUNDS, ...customBackgrounds], [customBackgrounds])
  const activeBg = allBackgrounds.find((b) => b.id === theme.backgroundId) ?? PRESET_BACKGROUNDS[0]
  const isCustomBg = activeBg.kind === 'gif' || activeBg.kind === 'custom' || activeBg.kind === 'video'
  const bgUrl = isCustomBg ? mediaUrls[activeBg.id] : undefined
  const isVideoBg = activeBg.kind === 'video'

  const todayKeyStr = new Date().toISOString().slice(0, 10)
  const todayCount = stats.sessions.filter((s) => s.date === todayKeyStr).length
  const goalMet = settings.dailyGoalSessions > 0 && todayCount >= settings.dailyGoalSessions

  const currentStreak = useMemo(() => calculateStreaks(stats.sessions).current, [stats.sessions])
  const activeMilestone = useMilestoneToast(currentStreak)

  // a new quote is picked each time a *new* focus session begins (transition into
  // 'focus'), then holds steady for the rest of that session — including across
  // pause/resume/reload — rather than rotating mid-session
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * FOCUS_QUOTES.length))
  const prevSessionTypeRef = useRef(timer.sessionType)
  useEffect(() => {
    if (timer.sessionType === 'focus' && timer.running && prevSessionTypeRef.current !== 'focus') {
      setQuoteIndex(Math.floor(Math.random() * FOCUS_QUOTES.length))
    }
    prevSessionTypeRef.current = timer.sessionType
  }, [timer.sessionType])
  const currentQuote = FOCUS_QUOTES[quoteIndex]

  // reserve space below the ring for label/controls/session pills; clamp so it never overflows the widget
  const ringSize = sizes.timer ? Math.max(160, Math.min(sizes.timer.width - 80, sizes.timer.height - 180)) : 300

  return (
    <div
      className="h-screen w-full flex flex-col items-center relative overflow-hidden transition-all duration-500"
      style={{
        ...(bgUrl && !isVideoBg
          ? {
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: `${theme.backgroundPosition.x}% ${theme.backgroundPosition.y}%`,
            }
          : !bgUrl
            ? { background: activeBg.value }
            : {}),
        ['--glass-blur' as string]: `${theme.glassIntensity * 0.4}px`,
        ['--glass-alpha' as string]: `${theme.glassIntensity / 50}`,
      }}
    >
      {bgUrl && isVideoBg && (
        <video
          key={bgUrl}
          src={bgUrl}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: `${theme.backgroundPosition.x}% ${theme.backgroundPosition.y}%` }}
          autoPlay
          loop
          muted
          playsInline
        />
      )}
      <div className="absolute inset-0 bg-black" style={{ opacity: theme.overlayOpacity / 100 }} />

      {theme.showQuotes && timer.sessionType === 'focus' && timer.running && (
        <p className="fixed top-4 left-4 z-0 max-w-sm text-white/45 text-lg italic leading-relaxed pointer-events-none select-none">
          “{currentQuote.text}” <span className="not-italic">— {currentQuote.author}</span>
        </p>
      )}

      <header
        className={`absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-[60] transition-opacity ${
          timer.running ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className={theme.showStatsChip ? '' : 'invisible'}>
          <Suspense fallback={null}>
            <StatsDialog
              stats={stats}
              accentColor={theme.accentColor}
              trigger={
                <button
                  className="glass-pill text-white text-base font-medium px-4 py-2 rounded-full hover:brightness-125 transition"
                  style={goalMet ? { color: theme.accentColor } : undefined}
                >
                  {settings.dailyGoalSessions > 0
                    ? `${todayCount}/${settings.dailyGoalSessions} today`
                    : `${todayCount} focus session${todayCount === 1 ? '' : 's'} today`}
                </button>
              }
            />
          </Suspense>
        </div>
        <div className="flex items-center gap-2">
          {settings.webcamPresenceEnabled && (
            <span
              title={
                presence.cameraError
                  ? presence.cameraError
                  : presence.isWatching
                    ? 'Presence detection active'
                    : 'Presence detection idle (starts with a focus session)'
              }
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                presence.cameraError ? 'bg-red-500' : presence.isWatching ? 'bg-green-500' : 'bg-white/20'
              }`}
            />
          )}
          <Suspense fallback={null}>
            <AmbientMixer buttonHidden={!theme.showMediaButtons} />
            <SpotifyEmbed buttonHidden={!theme.showMediaButtons} />
          </Suspense>
          {theme.showMediaButtons && isPiPSupported() && (
            <button
              onClick={() => (pip.isOpen ? pip.close() : pip.open())}
              title="Pop out timer"
              aria-label="Pop out timer"
              className="glass-pill text-white hover:brightness-125 w-11 h-11 rounded-full flex items-center justify-center transition"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <rect x="12" y="12" width="7" height="6" rx="1" fill="currentColor" />
              </svg>
            </button>
          )}
          <Suspense fallback={null}>
            <TimerMenu settings={settings} setSettings={setSettings} webcamCameraError={presence.cameraError} />
            <BackgroundMenu
              theme={theme}
              setTheme={setTheme}
              backgrounds={customBackgrounds}
              setBackgrounds={setCustomBackgrounds}
              mediaUrls={mediaUrls}
              widgetTints={tints}
              setWidgetTint={setTint}
            />
            <AppMenu theme={theme} setTheme={setTheme} backgrounds={customBackgrounds} mediaUrls={mediaUrls} />
          </Suspense>
        </div>
      </header>

      {pip.pipWindow &&
        createPortal(
          <PipTimerView
            secondsLeft={timer.secondsLeft}
            totalSeconds={timer.totalSeconds}
            sessionType={timer.sessionType}
            accentColor={theme.accentColor}
            running={timer.running}
            onStart={() => {
              playStartSound()
              timer.start()
            }}
            onPause={() => {
              playPauseSound()
              timer.pause()
            }}
            onSkip={timer.skip}
          />,
          pip.pipWindow.document.body
        )}

      {/* top matches the header's own footprint so the scroll region starts below it —
          padding-top would scroll away with content and let it clip under the fixed header */}
      <main
        ref={mainRef}
        className="absolute inset-x-0 bottom-0 top-20 z-10 flex flex-col items-center gap-6 px-4 pb-10 overflow-y-auto"
      >
        <DraggableWidget
          id="timer"
          title="Timer"
          position={layout.timer}
          size={sizes.timer}
          onMove={(pos) => setPosition('timer', pos)}
          onResize={(sz) => setSize('timer', sz)}
          minimized={minimized.timer}
          onToggleMinimize={() => toggleMinimized('timer')}
          minWidth={340}
          minHeight={520}
        >
          <div
            className={`glass relative flex flex-col items-center gap-5 px-6 sm:px-8 py-5 rounded-3xl ${
              sizes.timer ? 'w-full h-full' : 'w-[92vw] max-w-[440px]'
            }`}
            style={tints.timer ? ({ '--widget-tint': hexToRgba(tints.timer, 0.16) } as React.CSSProperties) : undefined}
          >
            <DragHandle />

            <p className={`text-white/70 text-sm ${activeTask ? '' : 'invisible'}`}>
              Working on: {activeTask?.title ?? ' '}
            </p>

            <TimerDisplay
              secondsLeft={timer.secondsLeft}
              totalSeconds={timer.totalSeconds}
              sessionType={timer.sessionType}
              accentColor={theme.accentColor}
              size={ringSize}
              fontFamily={fontFamilyFor(theme.timerFont)}
            />

            <div className="flex items-center gap-3 flex-wrap justify-center">
              {!timer.running ? (
                <Button
                  onClick={() => {
                    playStartSound()
                    timer.start()
                  }}
                  size="lg"
                  className="px-8 text-white border-0"
                  style={{ background: theme.accentColor }}
                >
                  Start
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    playPauseSound()
                    timer.pause()
                  }}
                  size="lg"
                  variant="secondary"
                  className="px-8"
                >
                  Pause
                </Button>
              )}
              <Button
                onClick={() => {
                  playResetSound()
                  timer.reset()
                }}
                size="lg"
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                Reset
              </Button>
              <Button onClick={timer.skip} size="lg" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
                Skip
              </Button>
            </div>

            <div className="flex items-center gap-2 justify-center">
              {[1, 5, 10].map((mins) => (
                <button
                  key={mins}
                  onClick={() => timer.addMinutes(mins)}
                  className="glass-pill text-xs text-white/70 hover:text-white px-3 py-1 rounded-full transition"
                >
                  +{mins}
                </button>
              ))}
            </div>

            <div
              className={`glass-pill flex gap-2 p-1 rounded-full flex-wrap justify-center ${
                theme.showSessionPills ? '' : 'hidden'
              }`}
            >
              {(['focus', 'shortBreak', 'longBreak'] as SessionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => timer.switchType(type)}
                  className={`text-xs px-3 py-1.5 rounded-full transition font-medium ${
                    timer.sessionType === type ? 'text-black' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  style={timer.sessionType === type ? { background: theme.accentColor } : undefined}
                >
                  {type === 'focus' ? 'Focus' : type === 'shortBreak' ? 'Short Break' : 'Long Break'}
                </button>
              ))}
            </div>
          </div>
        </DraggableWidget>

        {theme.showTasks && (
        <DraggableWidget
          id="tasks"
          title="Tasks"
          position={layout.tasks}
          size={sizes.tasks}
          onMove={(pos) => setPosition('tasks', pos)}
          onResize={(sz) => setSize('tasks', sz)}
          minimized={minimized.tasks}
          onToggleMinimize={() => toggleMinimized('tasks')}
          minWidth={260}
          minHeight={200}
        >
          <div
            className={`glass rounded-2xl p-4 ${sizes.tasks ? 'w-full h-full' : 'w-[92vw] max-w-80'}`}
            style={tints.tasks ? ({ '--widget-tint': hexToRgba(tints.tasks, 0.16) } as React.CSSProperties) : undefined}
          >
            <DragHandle />
            <TaskList
              tasks={tasks}
              setTasks={setTasks}
              activeTaskId={activeTaskId}
              setActiveTaskId={setActiveTaskId}
              accentColor={theme.accentColor}
              onTaskCompleted={() => {
                const key = new Date().toISOString().slice(0, 10)
                setStats((prev) => {
                  const tasksCompletedByDay = prev.tasksCompletedByDay ?? {}
                  return {
                    ...prev,
                    tasksCompletedByDay: { ...tasksCompletedByDay, [key]: (tasksCompletedByDay[key] ?? 0) + 1 },
                  }
                })
              }}
            />
          </div>
        </DraggableWidget>
        )}
      </main>

      <div className="fixed bottom-6 right-6 z-20 flex items-center gap-2">
        {isCustomized && (
          <button
            onClick={resetLayout}
            className="glass-pill text-sm text-white px-4 py-2 rounded-full hover:brightness-125 transition"
          >
            Reset layout
          </button>
        )}
        {(isCustomized || Object.keys(savedLayouts).length > 0) && (
          <LayoutsMenu
            savedLayouts={savedLayouts}
            onSave={saveLayoutAs}
            onApply={applyLayout}
            onDelete={deleteLayout}
          />
        )}
      </div>

      {timer.awaitingConfirm && (
        <PresenceCheckModal
          graceSeconds={settings.presenceGraceSeconds}
          onConfirm={timer.confirmPresence}
          onTimeout={timer.discardSession}
        />
      )}

      {needRefresh && (
        <div className="fixed bottom-6 left-6 z-[60] glass-dark rounded-full pl-4 pr-2 py-2 flex items-center gap-3 text-sm text-white">
          <span>Update available</span>
          <button
            onClick={() => updateServiceWorker(true)}
            className="bg-white text-black rounded-full px-3 py-1 font-medium hover:brightness-90 transition"
          >
            Reload
          </button>
        </div>
      )}

      {activeMilestone != null && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] glass-dark rounded-full px-5 py-2.5 text-sm text-white animate-in fade-in slide-in-from-bottom-2">
          🔥 {activeMilestone}-day streak!
        </div>
      )}
    </div>
  )
}

export default App
