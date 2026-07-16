import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { parseSpotifyUrl, spotifyEmbedUrl } from '../lib/spotify'
import { useLocalStorage } from '../hooks/useLocalStorage'

export function SpotifyEmbed({ buttonHidden = false }: { buttonHidden?: boolean }) {
  const [savedUrl, setSavedUrl] = useLocalStorage<string | null>('pomo-spotify-url', null)
  const [playerVisible, setPlayerVisible] = useLocalStorage<boolean>('pomo-spotify-player-visible', true)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const parsed = savedUrl ? parseSpotifyUrl(savedUrl) : null

  function handleSubmit() {
    const result = parseSpotifyUrl(draft)
    if (!result) {
      setError('Paste a Spotify playlist, album, or track link.')
      return
    }
    setError(null)
    setSavedUrl(draft)
    setPlayerVisible(true)
    setDraft('')
  }

  function handleClear() {
    setSavedUrl(null)
    setDraft('')
    setError(null)
  }

  return (
    <>
      <Popover>
        <PopoverTrigger
          render={
            <button
              title="Spotify"
              className={`glass-pill text-white hover:brightness-125 w-11 h-11 rounded-full items-center justify-center transition ${
                buttonHidden ? 'hidden' : 'flex'
              } ${parsed ? 'ring-2 ring-[#1DB954]/60' : ''}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.59 14.4a.62.62 0 0 1-.86.21c-2.36-1.44-5.33-1.77-8.83-.97a.62.62 0 1 1-.28-1.22c3.83-.88 7.12-.5 9.76 1.12.3.18.4.57.21.86Zm1.22-2.72a.78.78 0 0 1-1.07.26c-2.7-1.66-6.82-2.14-10.02-1.17a.78.78 0 1 1-.45-1.49c3.65-1.1 8.19-.57 11.28 1.33.37.23.49.72.26 1.07Zm.1-2.84C14.98 8.9 9.08 8.7 5.6 9.76a.94.94 0 1 1-.54-1.8c4-1.22 10.5-.98 14.62 1.5a.94.94 0 0 1-.97 1.6Z" />
              </svg>
            </button>
          }
        />
        <PopoverContent className="bg-[#13141a]/95 backdrop-blur-2xl border border-white/10 text-white p-4 rounded-2xl shadow-2xl w-80">
          <div className="space-y-2">
            <span className="text-sm font-medium text-white/80">Spotify</span>
            <p className="text-xs text-white/40">
              Paste a playlist, album, or track link. Note: full songs only play if you're logged into Spotify
              Premium in this browser — otherwise Spotify limits embeds to 30-second previews.
            </p>
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="https://open.spotify.com/playlist/..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 text-xs"
              />
              <Button onClick={handleSubmit} variant="secondary" size="sm">
                Add
              </Button>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            {parsed && (
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setPlayerVisible((v) => !v)}
                  className="text-xs text-white/50 hover:text-white transition"
                >
                  {playerVisible ? 'Hide player' : 'Show player'}
                </button>
                <button onClick={handleClear} className="text-xs text-white/50 hover:text-white transition">
                  Remove
                </button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Persistent player — outside the popover so closing it doesn't kill playback. */}
      {parsed && (
        <div
          className={`fixed bottom-[230px] left-6 z-30 w-[320px] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
            playerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <iframe
            key={savedUrl}
            src={spotifyEmbedUrl(parsed.type, parsed.id)}
            width="320"
            height="152"
            style={{ borderRadius: 12, border: 0, display: 'block' }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            title="Spotify player"
          />
        </div>
      )}
    </>
  )
}
