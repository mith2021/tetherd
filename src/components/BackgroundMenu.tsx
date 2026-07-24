import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import type { BackgroundOption, ThemeSettings } from '../types'
import { BackgroundPicker } from './BackgroundPicker'
import { BackgroundPositionEditor } from './BackgroundPositionEditor'
import { dominantColorFor } from '../lib/dominantColor'
import { PRESET_BACKGROUNDS } from '../backgrounds'

interface Props {
  theme: ThemeSettings
  setTheme: React.Dispatch<React.SetStateAction<ThemeSettings>>
  backgrounds: BackgroundOption[]
  setBackgrounds: React.Dispatch<React.SetStateAction<BackgroundOption[]>>
  mediaUrls: Record<string, string>
  widgetTints: Record<string, string | null>
  setWidgetTint: (id: string, color: string | null) => void
}

const TINT_WIDGETS = [
  { id: 'timer', label: 'Timer' },
  { id: 'tasks', label: 'Tasks' },
] as const

export function BackgroundMenu({
  theme,
  setTheme,
  backgrounds,
  setBackgrounds,
  mediaUrls,
  widgetTints,
  setWidgetTint,
}: Props) {
  const [picking, setPicking] = useState(false)
  const selectedMediaUrl = mediaUrls[theme.backgroundId]
  const allBackgrounds = [...PRESET_BACKGROUNDS, ...backgrounds]
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

  async function pickWithEyeDropperInto(apply: (hex: string) => void) {
    try {
      // EyeDropper isn't in TS lib.dom yet in this TS version — feature-detected above
      const dropper = new (window as unknown as { EyeDropper: new () => { open(): Promise<{ sRGBHex: string }> } }).EyeDropper()
      const result = await dropper.open()
      apply(result.sRGBHex)
    } catch {
      // user cancelled — no-op
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            title="Background"
            aria-label="Background"
            className="glass-pill text-white hover:brightness-125 w-11 h-11 rounded-full"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </Button>
        }
      />
      <PopoverContent className="glass-dark border-white/10 text-white p-4 rounded-2xl shadow-2xl w-80 max-h-[80vh] overflow-y-auto space-y-5">
        <span className="text-sm font-medium text-white/80">Background</span>

        <div className="space-y-2">
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

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/70">Glass intensity</span>
            <span className="text-white/50 tabular-nums">{theme.glassIntensity}%</span>
          </div>
          <Slider
            min={0}
            max={100}
            step={5}
            value={theme.glassIntensity}
            onValueChange={(v) => setTheme((t) => ({ ...t, glassIntensity: v as number }))}
          />
        </div>

        <Separator className="bg-white/10" />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/70">Overlay darkness</span>
            <span className="text-white/50 tabular-nums">{theme.overlayOpacity}%</span>
          </div>
          <Slider
            min={0}
            max={80}
            step={5}
            value={theme.overlayOpacity}
            onValueChange={(v) => setTheme((t) => ({ ...t, overlayOpacity: v as number }))}
          />
        </div>

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
                onClick={() => pickWithEyeDropperInto((hex) => setTheme((t) => ({ ...t, accentColor: hex })))}
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
            <input
              type="color"
              value={theme.accentColor}
              onChange={(e) => setTheme((t) => ({ ...t, accentColor: e.target.value }))}
              title="Choose accent color"
              aria-label="Choose accent color"
              className="w-7 h-7 rounded-full border-2 border-white/30 bg-transparent p-0 cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none"
            />
          </div>
        </div>

        <Separator className="bg-white/10" />

        <div className="space-y-2">
          <span className="text-sm text-white/70">Widget tint</span>
          <div className="flex gap-4">
            {TINT_WIDGETS.map(({ id, label }) => (
              <div key={id} className="flex items-center gap-1.5">
                <span className="text-xs text-white/50">{label}</span>
                <button
                  onClick={() => setWidgetTint(id, null)}
                  title="No tint"
                  aria-label={`No tint for ${label}`}
                  className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-white/50 text-[10px] bg-white/5 transition"
                  style={{ borderColor: !widgetTints[id] ? 'white' : 'transparent' }}
                >
                  ✕
                </button>
                {hasEyeDropper && (
                  <button
                    onClick={() => pickWithEyeDropperInto((hex) => setWidgetTint(id, hex))}
                    title="Eyedropper — pick any pixel on screen"
                    aria-label={`Eyedropper tint for ${label}`}
                    className="w-6 h-6 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:border-white/60 transition"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m2 22 1-4 9.5-9.5" />
                      <path d="M13.5 8.5 17 5" />
                      <path d="m17 5 2 2 2-2a3 3 0 0 0-4-4l-2 2 2 2Z" />
                    </svg>
                  </button>
                )}
                <input
                  type="color"
                  value={widgetTints[id] ?? '#f97316'}
                  onChange={(e) => setWidgetTint(id, e.target.value)}
                  title={`Choose ${label} tint`}
                  aria-label={`Choose ${label} tint`}
                  className="w-6 h-6 rounded-full border-2 border-white/30 bg-transparent p-0 cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none"
                />
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
