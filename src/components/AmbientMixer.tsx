import { useEffect, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { parseYouTubeUrl, youtubeEmbedUrl, type YouTubeRef } from '../lib/youtube'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { setAmbientTrackVolume, stopAllAmbientTracks, type AmbientTrackId } from '../lib/sounds'

const NOISE_TRACKS: { id: AmbientTrackId; label: string; emoji: string }[] = [
  { id: 'rain', label: 'Rain', emoji: '🌧️' },
  { id: 'fire', label: 'Fire', emoji: '🔥' },
  { id: 'brown', label: 'Brown noise', emoji: '🟤' },
  { id: 'white', label: 'White noise', emoji: '⚪' },
]

export function AmbientMixer({ buttonHidden = false }: { buttonHidden?: boolean }) {
  const [savedRef, setSavedRef] = useLocalStorage<YouTubeRef | null>('pomo-ambient-youtube-ref', null)
  const [playerVisible, setPlayerVisible] = useLocalStorage<boolean>('pomo-ambient-player-visible', true)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [noiseVolumes, setNoiseVolumes] = useLocalStorage<Record<AmbientTrackId, number>>('pomo-ambient-noise-volumes', {
    rain: 0,
    fire: 0,
    brown: 0,
    white: 0,
  })

  // re-apply saved volumes to the WebAudio engine on mount (engine state doesn't persist across reload)
  useEffect(() => {
    for (const track of NOISE_TRACKS) {
      const v = noiseVolumes[track.id] ?? 0
      if (v > 0) setAmbientTrackVolume(track.id, v)
    }
    return () => stopAllAmbientTracks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleNoiseChange(id: AmbientTrackId, volume: number) {
    setNoiseVolumes((prev) => ({ ...prev, [id]: volume }))
    setAmbientTrackVolume(id, volume)
  }

  function handleSubmit() {
    const ref = parseYouTubeUrl(draft)
    if (!ref) {
      setError('Paste a YouTube video or playlist link.')
      return
    }
    setError(null)
    setSavedRef(ref)
    setPlayerVisible(true)
    setDraft('')
  }

  function handleStop() {
    setSavedRef(null)
    setDraft('')
    setError(null)
  }

  return (
    <>
      <Popover>
        <PopoverTrigger
          render={
            <button
              title="Music / ambient sound"
              aria-label="Music / ambient sound"
              className={`glass-pill text-white hover:brightness-125 w-11 h-11 rounded-full items-center justify-center transition ${
                buttonHidden ? 'hidden' : 'flex'
              } ${savedRef ? 'ring-2 ring-white/50' : ''}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                <path d="M18.5 6a9 9 0 0 1 0 12" />
              </svg>
            </button>
          }
        />
        <PopoverContent className="glass-dark text-white p-4 rounded-2xl shadow-2xl w-80">
          <div className="space-y-3">
            <div className="space-y-2">
              <span className="text-sm font-medium text-white/80">White noise</span>
              {NOISE_TRACKS.map((track) => (
                <div key={track.id} className="flex items-center gap-2">
                  <span className="text-base w-5 shrink-0">{track.emoji}</span>
                  <span className="text-xs text-white/60 w-20 shrink-0">{track.label}</span>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={(noiseVolumes[track.id] ?? 0) * 100}
                    onValueChange={(v) => handleNoiseChange(track.id, (v as number) / 100)}
                  />
                </div>
              ))}
            </div>

            <span className="text-sm font-medium text-white/80">Music / ambient sound</span>
            <p className="text-xs text-white/40">
              Paste a YouTube video or playlist link. It keeps playing even when you close this menu.
            </p>
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="https://youtube.com/watch?v=..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 text-xs"
              />
              <Button onClick={handleSubmit} variant="secondary" size="sm">
                Play
              </Button>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            {savedRef && (
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setPlayerVisible((v) => !v)}
                  className="text-xs text-white/50 hover:text-white transition"
                >
                  {playerVisible ? 'Hide player' : 'Show player'}
                </button>
                <button onClick={handleStop} className="text-xs text-white/50 hover:text-white transition">
                  Stop
                </button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Player lives OUTSIDE the popover so closing it never unmounts the iframe / kills audio.
          Hidden via opacity+translate, never display:none, so playback continues while hidden. */}
      {savedRef && (
        <div
          className={`fixed bottom-6 left-6 z-30 w-[320px] rounded-2xl overflow-hidden shadow-2xl border border-white/10 transition-all duration-300 ${
            playerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <iframe
            src={youtubeEmbedUrl(savedRef)}
            width="320"
            height="180"
            style={{ border: 0, display: 'block' }}
            allow="autoplay; encrypted-media"
            title="Ambient sound player"
          />
        </div>
      )}
    </>
  )
}
