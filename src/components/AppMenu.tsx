import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { useRef, useState } from 'react'
import type { BackgroundOption, ThemeSettings } from '../types'
import { TIMER_FONTS } from '../fonts'
import { applyBackup, exportBackup, parseBackup } from '../lib/backupData'

interface Props {
  theme: ThemeSettings
  setTheme: React.Dispatch<React.SetStateAction<ThemeSettings>>
  backgrounds: BackgroundOption[]
  mediaUrls: Record<string, string>
}

export function AppMenu({ theme, setTheme }: Props) {
  const [importError, setImportError] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const payload = parseBackup(text)
      applyBackup(payload)
      setImportError(null)
      // reload so every hook re-hydrates from the newly written localStorage values
      window.location.reload()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not import that file.')
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            title="App settings"
            aria-label="App settings"
            className="glass-pill text-white hover:brightness-125 w-11 h-11 rounded-full"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Button>
        }
      />
      <PopoverContent className="glass-dark border-white/10 text-white p-4 rounded-2xl shadow-2xl w-80 max-h-[80vh] overflow-y-auto space-y-5">
        <span className="text-sm font-medium text-white/80">App</span>

        <p className="text-xs text-white/40">
          Shortcuts: <kbd className="px-1 py-0.5 rounded bg-white/10">Space</kbd> start/pause ·{' '}
          <kbd className="px-1 py-0.5 rounded bg-white/10">R</kbd> reset ·{' '}
          <kbd className="px-1 py-0.5 rounded bg-white/10">S</kbd> skip
        </p>

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
          <p className="text-white/40 text-xs">{TIMER_FONTS.find((f) => f.id === theme.timerFont)?.name}</p>
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
              ['showQuotes', 'Motivational quotes'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-white/60">{label}</span>
              <Switch checked={theme[key]} onCheckedChange={(v) => setTheme((t) => ({ ...t, [key]: v }))} />
            </div>
          ))}
        </div>

        <Separator className="bg-white/10" />

        <div className="space-y-2">
          <span className="text-sm text-white/70">Backup</span>
          <div className="flex gap-2">
            <button
              onClick={exportBackup}
              className="flex-1 px-3 py-1.5 rounded-lg text-sm text-white/70 border border-white/15 hover:border-white/40 hover:text-white transition"
            >
              Export data
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="flex-1 px-3 py-1.5 rounded-lg text-sm text-white/70 border border-white/15 hover:border-white/40 hover:text-white transition"
            >
              Import data
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              aria-label="Import data file"
              onChange={handleImportFile}
            />
          </div>
          {importError && <p className="text-xs text-red-400">{importError}</p>}
        </div>
      </PopoverContent>
    </Popover>
  )
}
