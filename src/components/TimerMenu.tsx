import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import type { TimerSettings } from '../types'
import { requestNotificationPermission } from '../lib/notify'

interface Props {
  settings: TimerSettings
  setSettings: React.Dispatch<React.SetStateAction<TimerSettings>>
  webcamCameraError: string | null
}

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

const PRESETS: { name: string; focusMin: number; shortBreakMin: number; longBreakMin: number }[] = [
  { name: '25/5/15', focusMin: 25, shortBreakMin: 5, longBreakMin: 15 },
  { name: '50/10/20', focusMin: 50, shortBreakMin: 10, longBreakMin: 20 },
  { name: '90/15/30', focusMin: 90, shortBreakMin: 15, longBreakMin: 30 },
]

export function TimerMenu({ settings, setSettings, webcamCameraError }: Props) {
  const activePreset = PRESETS.find(
    (p) =>
      p.focusMin === settings.focusMin &&
      p.shortBreakMin === settings.shortBreakMin &&
      p.longBreakMin === settings.longBreakMin,
  )?.name

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            title="Timer settings"
            aria-label="Timer settings"
            className="glass-pill text-white hover:brightness-125 w-11 h-11 rounded-full"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </Button>
        }
      />
      <PopoverContent className="glass-dark border-white/10 text-white p-4 rounded-2xl shadow-2xl w-80 max-h-[80vh] overflow-y-auto space-y-5">
        <span className="text-sm font-medium text-white/80">Timer</span>

        <div className="space-y-2">
          <span className="text-sm text-white/70">Presets</span>
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    focusMin: p.focusMin,
                    shortBreakMin: p.shortBreakMin,
                    longBreakMin: p.longBreakMin,
                  }))
                }
                className={`px-3 py-1.5 rounded-lg text-xs transition border ${
                  activePreset === p.name
                    ? 'bg-white text-black border-white'
                    : 'text-white/70 border-white/15 hover:border-white/40 hover:text-white'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

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
              Uses your camera to detect if you've stepped away — auto-pauses focus sessions. Video never leaves
              your device.
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
      </PopoverContent>
    </Popover>
  )
}
