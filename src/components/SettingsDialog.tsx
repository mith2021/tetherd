import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { useMemo, useState } from 'react'
import type { BackgroundOption, ThemeSettings, TimerSettings } from '../types'
import { BackgroundPicker } from './BackgroundPicker'
import { BackgroundPositionEditor } from './BackgroundPositionEditor'
import { requestNotificationPermission } from '../lib/notify'
import { TIMER_FONTS } from '../fonts'
import { PRESET_BACKGROUNDS } from '../backgrounds'
import { dominantColorFor } from '../lib/dominantColor'

interface Props {
  settings: TimerSettings
  setSettings: React.Dispatch<React.SetStateAction<TimerSettings>>
  theme: ThemeSettings
  setTheme: React.Dispatch<React.SetStateAction<ThemeSettings>>
  backgrounds: BackgroundOption[]
  setBackgrounds: React.Dispatch<React.SetStateAction<BackgroundOption[]>>
  mediaUrls: Record<string, string>
  webcamCameraError: string | null
}

// short curated spread — Auto (samples the background) and the eyedropper cover
// the rest of the color space, so this list only needs a handful of anchors
const ACCENTS = [
  { name: 'Orange', color: '#f97316' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Pink', color: '#ec4899' },
]

function Row({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-white/70">{label}</span>
        {value && <span className="text-white/50 tabular-nums">{value}</span>}
      </div>
      {children}
    </div>
  )
}

export function SettingsDialog({
  settings,
  setSettings,
  theme,
  setTheme,
  backgrounds,
  setBackgrounds,
  mediaUrls,
  webcamCameraError,
}: Props) {
  const selectedMediaUrl = mediaUrls[theme.backgroundId]
  const [picking, setPicking] = useState(false)
  const allBackgrounds = useMemo(() => [...PRESET_BACKGROUNDS, ...backgrounds], [backgrounds])
  const activeBg = allBackgrounds.find((b) => b.id === theme.backgroundId) ?? PRESET_BACKGROUNDS[0]
  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window

  async function pickFromBackground() {
    setPicking(true)
    try {
      const color = await dominantColorFor(activeBg, selectedMediaUrl)
      if (color) setTheme((t) => ({ ...t, accentColor: color }))
    } finally {
      setPicking(false)
    }
  }

  async function pickWithEyeDropper() {
    try {
      // EyeDropper isn't in TS lib.dom yet in this TS version — feature-detected above
      const dropper = new (window as unknown as { EyeDropper: new () => { open(): Promise<{ sRGBHex: string }> } }).EyeDropper()
      const result = await dropper.open()
      setTheme((t) => ({ ...t, accentColor: result.sRGBHex }))
    } catch {
      // user cancelled — no-op
    }
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="glass-pill text-white hover:brightness-125 w-11 h-11 rounded-full"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Button>
        }
      />
      <DialogContent className="glass-dark border-white/10 text-white sm:max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-white/40 -mt-2">
          Shortcuts: <kbd className="px-1 py-0.5 rounded bg-white/10">Space</kbd> start/pause ·{' '}
          <kbd className="px-1 py-0.5 rounded bg-white/10">R</kbd> reset ·{' '}
          <kbd className="px-1 py-0.5 rounded bg-white/10">S</kbd> skip
        </p>

        <Tabs defaultValue="timer">
          <TabsList className="bg-white/5">
            <TabsTrigger
              value="timer"
              className="text-white/60 data-active:text-white data-active:bg-white/15"
            >
              Timer
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="text-white/60 data-active:text-white data-active:bg-white/15"
            >
              Appearance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timer" className="space-y-5 pt-4">
            <Row label="Focus" value={`${settings.focusMin} min`}>
              <Slider
                min={5}
                max={90}
                step={5}
                value={settings.focusMin}
                onValueChange={(v) => setSettings((s) => ({ ...s, focusMin: v as number }))}
              />
            </Row>
            <Row label="Short break" value={`${settings.shortBreakMin} min`}>
              <Slider
                min={1}
                max={30}
                step={1}
                value={settings.shortBreakMin}
                onValueChange={(v) => setSettings((s) => ({ ...s, shortBreakMin: v as number }))}
              />
            </Row>
            <Row label="Long break" value={`${settings.longBreakMin} min`}>
              <Slider
                min={5}
                max={45}
                step={5}
                value={settings.longBreakMin}
                onValueChange={(v) => setSettings((s) => ({ ...s, longBreakMin: v as number }))}
              />
            </Row>
            <Row label="Long break interval" value={`every ${settings.longBreakInterval}`}>
              <Slider
                min={2}
                max={8}
                step={1}
                value={settings.longBreakInterval}
                onValueChange={(v) => setSettings((s) => ({ ...s, longBreakInterval: v as number }))}
              />
            </Row>
            <Separator className="bg-white/10" />

            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Auto-start breaks</span>
              <Switch
                checked={settings.autoStartBreaks}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, autoStartBreaks: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Auto-start focus</span>
              <Switch
                checked={settings.autoStartFocus}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, autoStartFocus: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-white/70 block">Pause when tab is inactive</span>
                <span className="text-xs text-white/40">Auto-pauses focus sessions if you switch away</span>
              </div>
              <Switch
                checked={settings.pauseOnTabAway}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, pauseOnTabAway: v }))}
              />
            </div>

            <Separator className="bg-white/10" />

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-white/70 block">Confirm you're present</span>
                <span className="text-xs text-white/40">
                  On focus completion, asks you to confirm before counting it — catches forgotten sessions
                </span>
              </div>
              <Switch
                checked={settings.confirmPresenceOnComplete}
                onCheckedChange={(v) => {
                  setSettings((s) => ({ ...s, confirmPresenceOnComplete: v }))
                  if (v) requestNotificationPermission()
                }}
              />
            </div>
            {settings.confirmPresenceOnComplete && (
              <Row label="Grace period" value={`${settings.presenceGraceSeconds}s`}>
                <Slider
                  min={30}
                  max={300}
                  step={30}
                  value={settings.presenceGraceSeconds}
                  onValueChange={(v) => setSettings((s) => ({ ...s, presenceGraceSeconds: v as number }))}
                />
              </Row>
            )}

            <Separator className="bg-white/10" />

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-white/70 block">Webcam presence detection</span>
                <span className="text-xs text-white/40">
                  Uses your camera to detect if you've stepped away — auto-pauses focus sessions. Video never
                  leaves your device.
                </span>
              </div>
              <Switch
                checked={settings.webcamPresenceEnabled}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, webcamPresenceEnabled: v }))}
              />
            </div>
            {settings.webcamPresenceEnabled && (
              <>
                <Row label="Away threshold" value={`${settings.webcamAwaySeconds}s`}>
                  <Slider
                    min={5}
                    max={60}
                    step={5}
                    value={settings.webcamAwaySeconds}
                    onValueChange={(v) => setSettings((s) => ({ ...s, webcamAwaySeconds: v as number }))}
                  />
                </Row>
                {webcamCameraError && <p className="text-red-400 text-xs">{webcamCameraError}</p>}
              </>
            )}
          </TabsContent>

          <TabsContent value="appearance" className="space-y-5 pt-4">
            <div className="space-y-2">
              <span className="text-sm text-white/70">Background</span>
              <BackgroundPicker
                backgrounds={backgrounds}
                setBackgrounds={setBackgrounds}
                selectedId={theme.backgroundId}
                onSelect={(id) => setTheme((t) => ({ ...t, backgroundId: id, backgroundPosition: { x: 50, y: 50 } }))}
                mediaUrls={mediaUrls}
              />
              <p className="text-white/40 text-xs">
                For best results, upload landscape images at least 1920×1080 (16:9).
              </p>
            </div>

            {selectedMediaUrl && (
              <>
                <Separator className="bg-white/10" />
                <div className="space-y-2">
                  <span className="text-sm text-white/70">Reposition</span>
                  <BackgroundPositionEditor
                    imageUrl={selectedMediaUrl}
                    position={theme.backgroundPosition}
                    onChange={(pos) => setTheme((t) => ({ ...t, backgroundPosition: pos }))}
                  />
                </div>
              </>
            )}

            <Separator className="bg-white/10" />

            <Row label="Glass intensity" value={`${theme.glassIntensity}%`}>
              <Slider
                min={0}
                max={100}
                step={5}
                value={theme.glassIntensity}
                onValueChange={(v) => setTheme((t) => ({ ...t, glassIntensity: v as number }))}
              />
            </Row>

            <Separator className="bg-white/10" />

            <div className="space-y-2">
              <span className="text-sm text-white/70">Timer font</span>
              <div className="flex flex-wrap gap-2">
                {TIMER_FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setTheme((t) => ({ ...t, timerFont: f.id }))}
                    className={`px-3 py-2 rounded-lg text-lg transition border ${
                      theme.timerFont === f.id
                        ? 'bg-white text-black border-white'
                        : 'text-white/70 border-white/15 hover:border-white/40 hover:text-white'
                    }`}
                    style={{ fontFamily: f.family }}
                  >
                    25:00
                  </button>
                ))}
              </div>
              <p className="text-white/40 text-xs">
                {TIMER_FONTS.find((f) => f.id === theme.timerFont)?.name}
              </p>
            </div>

            <Separator className="bg-white/10" />

            <div className="space-y-3">
              <span className="text-sm text-white/70">Show elements</span>
              {(
                [
                  ['showTasks', 'Task list'],
                  ['showSessionPills', 'Session type pills'],
                  ['showStatsChip', 'Focus sessions counter'],
                  ['showMediaButtons', 'Music / Spotify / pop-out buttons'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-white/60">{label}</span>
                  <Switch
                    checked={theme[key]}
                    onCheckedChange={(v) => setTheme((t) => ({ ...t, [key]: v }))}
                  />
                </div>
              ))}
            </div>

            <Separator className="bg-white/10" />

            <Row label="Overlay darkness" value={`${theme.overlayOpacity}%`}>
              <Slider
                min={0}
                max={80}
                step={5}
                value={theme.overlayOpacity}
                onValueChange={(v) => setTheme((t) => ({ ...t, overlayOpacity: v as number }))}
              />
            </Row>

            <Separator className="bg-white/10" />

            <div className="space-y-2">
              <span className="text-sm text-white/70">Accent color</span>
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  onClick={pickFromBackground}
                  disabled={picking}
                  title="Pick from background"
                  className="w-7 h-7 rounded-full border-2 border-white/30 flex items-center justify-center text-white/70 hover:text-white hover:border-white/60 transition disabled:opacity-50"
                  style={{
                    background: 'conic-gradient(from 0deg, #f97316, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444, #f97316)',
                  }}
                >
                  {picking && <span className="w-2.5 h-2.5 rounded-full bg-black/60 animate-pulse" />}
                </button>
                {hasEyeDropper && (
                  <button
                    onClick={pickWithEyeDropper}
                    title="Eyedropper — pick any pixel on screen"
                    className="w-7 h-7 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:border-white/60 transition"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m2 22 1-4 9.5-9.5" />
                      <path d="M13.5 8.5 17 5" />
                      <path d="m17 5 2 2 2-2a3 3 0 0 0-4-4l-2 2 2 2Z" />
                    </svg>
                  </button>
                )}
                <div className="w-px h-5 bg-white/15 mx-0.5" />
                {ACCENTS.map((a) => (
                  <button
                    key={a.name}
                    onClick={() => setTheme((t) => ({ ...t, accentColor: a.color }))}
                    title={a.name}
                    className="w-7 h-7 rounded-full border-2 transition"
                    style={{
                      background: a.color,
                      borderColor: theme.accentColor === a.color ? 'white' : 'transparent',
                    }}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
