import { useEffect, useMemo, Suspense, lazy } from 'react'
import { createPortal } from 'react-dom'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTimer } from './hooks/useTimer'
import { useBackgroundMedia } from './hooks/useBackgroundMedia'
import { useWidgetLayout } from './hooks/useWidgetLayout'
import { usePictureInPicture, isPiPSupported } from './hooks/usePictureInPicture'
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
import type { BackgroundOption, SessionType, Stats, Task, ThemeSettings, TimerSettings } from './types'

const AmbientMixer = lazy(() => import('./components/AmbientMixer').then((m) => ({ default: m.AmbientMixer })))
const SpotifyEmbed = lazy(() => import('./components/SpotifyEmbed').then((m) => ({ default: m.SpotifyEmbed })))
const StatsDialog = lazy(() => import('./components/StatsDialog').then((m) => ({ default: m.StatsDialog })))
const SettingsDialog = lazy(() => import('./components/SettingsDialog').then((m) => ({ default: m.SettingsDialog })))

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
  dailySessionGoal: 4,
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
}

function App() {
  const [settingsRaw, setSettings] = useLocalStorage<TimerSettings>('pomo-settings', DEFAULT_SETTINGS)
  const settings: TimerSettings = { ...DEFAULT_SETTINGS, ...settingsRaw }
  const [themeRaw, setTheme] = useLocalStorage<ThemeSettings>('pomo-theme', DEFAULT_THEME)
  const theme: ThemeSettings = { ...DEFAULT_THEME, ...themeRaw }
  const [customBackgrounds, setCustomBackgrounds] = useLocalStorage<BackgroundOption[]>('pomo-custom-bgs', [])
  const [tasks, setTasks] = useLocalStorage<Task[]>('pomo-tasks', [])
  const [activeTaskId, setActiveTaskId] = useLocalStorage<string | null>('pomo-active-task', null)
  const [stats, setStats] = useLocalStorage<Stats>('pomo-stats', { sessions: [], tasksCompletedByDay: {} })

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
  } = useWidgetLayout(['timer', 'tasks'])
  const pip = usePictureInPicture()

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

  const timer = useTimer({
    settings,
    onSessionComplete: handleSessionComplete,
    setStats,
    requireConfirmOnFocusComplete: settings.confirmPresenceOnComplete,
  })

  useEffect(() => {
    if (timer.awaitingConfirm) notifySessionComplete()
  }, [timer.awaitingConfirm])

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

  const activeTask = tasks.find((t) => t.id === activeTaskId)
  const todayKeyStr = new Date().toISOString().slice(0, 10)
  const todayCount = stats.sessions.filter((s) => s.date === todayKeyStr).length

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

      <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-[60]">
        <div className={theme.showStatsChip ? '' : 'invisible'}>
          <Suspense fallback={null}>
            <StatsDialog
              stats={stats}
              settings={settings}
              accentColor={theme.accentColor}
              todayCount={todayCount}
              trigger={
                <button className="glass-pill text-white text-base font-medium px-4 py-2 rounded-full hover:brightness-125 transition">
                  {todayCount} focus session{todayCount === 1 ? '' : 's'} today
                </button>
              }
            />
          </Suspense>
        </div>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <AmbientMixer buttonHidden={!theme.showMediaButtons} />
            <SpotifyEmbed buttonHidden={!theme.showMediaButtons} />
          </Suspense>
          {theme.showMediaButtons && isPiPSupported() && (
            <button
              onClick={() => (pip.isOpen ? pip.close() : pip.open())}
              title="Pop out timer"
              className="glass-pill text-white hover:brightness-125 w-11 h-11 rounded-full flex items-center justify-center transition"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <rect x="12" y="12" width="7" height="6" rx="1" fill="currentColor" />
              </svg>
            </button>
          )}
          <Suspense fallback={null}>
            <SettingsDialog
              settings={settings}
              setSettings={setSettings}
              theme={theme}
              setTheme={setTheme}
              backgrounds={customBackgrounds}
              setBackgrounds={setCustomBackgrounds}
              mediaUrls={mediaUrls}
            />
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

      <main className="relative z-10 flex flex-col items-center gap-6 px-4 pt-24 pb-10 w-full max-h-screen overflow-y-auto">
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
          minHeight={420}
        >
          <div
            className={`glass flex flex-col items-center gap-5 px-6 sm:px-8 py-5 rounded-3xl ${
              sizes.timer ? 'w-full h-full' : 'w-[92vw] max-w-[440px]'
            }`}
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
                    timer.sessionType === type
                      ? 'bg-white text-black'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
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
          >
            <DragHandle />
            <TaskList
              tasks={tasks}
              setTasks={setTasks}
              activeTaskId={activeTaskId}
              setActiveTaskId={setActiveTaskId}
              onTaskCompleted={() => {
                const key = new Date().toISOString().slice(0, 10)
                setStats((prev) => ({
                  ...prev,
                  tasksCompletedByDay: { ...prev.tasksCompletedByDay, [key]: (prev.tasksCompletedByDay[key] ?? 0) + 1 },
                }))
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
    </div>
  )
}

export default App
