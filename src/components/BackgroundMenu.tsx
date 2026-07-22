import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import type { BackgroundOption, ThemeSettings } from '../types'
import { BackgroundPicker } from './BackgroundPicker'
import { BackgroundPositionEditor } from './BackgroundPositionEditor'

interface Props {
  theme: ThemeSettings
  setTheme: React.Dispatch<React.SetStateAction<ThemeSettings>>
  backgrounds: BackgroundOption[]
  setBackgrounds: React.Dispatch<React.SetStateAction<BackgroundOption[]>>
  mediaUrls: Record<string, string>
}

export function BackgroundMenu({ theme, setTheme, backgrounds, setBackgrounds, mediaUrls }: Props) {
  const selectedMediaUrl = mediaUrls[theme.backgroundId]

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
      </PopoverContent>
    </Popover>
  )
}
