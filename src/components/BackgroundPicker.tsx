import { useRef, useState } from 'react'
import { PRESET_BACKGROUNDS } from '../backgrounds'
import { saveMedia, deleteMedia } from '../lib/mediaStore'
import type { BackgroundOption } from '../types'

interface Props {
  backgrounds: BackgroundOption[] // custom ones only (metadata; blob lives in IndexedDB)
  setBackgrounds: React.Dispatch<React.SetStateAction<BackgroundOption[]>>
  selectedId: string
  onSelect: (id: string) => void
  mediaUrls: Record<string, string> // id -> object URL, populated by parent
}

const MAX_FILE_MB = 25
const MAX_VIDEO_FILE_MB = 100

export function BackgroundPicker({ backgrounds, setBackgrounds, selectedId, onSelect, mediaUrls }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const isVideo = file.type.startsWith('video/')
    if (!file.type.startsWith('image/') && !isVideo) {
      setError('Only image, gif, or video files allowed.')
      return
    }
    const maxMb = isVideo ? MAX_VIDEO_FILE_MB : MAX_FILE_MB
    if (file.size > maxMb * 1024 * 1024) {
      setError(`File too big — max ${maxMb}MB.`)
      return
    }
    setError(null)

    const id = `custom-${Date.now()}`
    await saveMedia(id, file)
    const kind = isVideo ? 'video' : file.type === 'image/gif' ? 'gif' : 'custom'
    const option: BackgroundOption = { id, name: file.name, kind, value: id }
    setBackgrounds((prev) => [...prev, option])
    onSelect(id)
  }

  async function handleRemove(id: string) {
    await deleteMedia(id)
    setBackgrounds((prev) => prev.filter((b) => b.id !== id))
    if (selectedId === id) onSelect(PRESET_BACKGROUNDS[0].id)
  }

  const allOptions = [...PRESET_BACKGROUNDS, ...backgrounds]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {allOptions.map((bg) => {
          const isCustom = bg.kind === 'gif' || bg.kind === 'custom' || bg.kind === 'video'
          const previewUrl = isCustom ? mediaUrls[bg.id] : undefined
          return (
            <div key={bg.id} className="relative group">
              <button
                onClick={() => onSelect(bg.id)}
                className={`w-full aspect-video rounded-lg border-2 overflow-hidden transition ${
                  selectedId === bg.id ? 'border-white' : 'border-white/10 hover:border-white/40'
                }`}
                style={
                  previewUrl && bg.kind !== 'video'
                    ? { backgroundImage: `url(${previewUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : !previewUrl
                      ? { background: bg.value }
                      : undefined
                }
                title={bg.name}
              >
                {previewUrl && bg.kind === 'video' && (
                  <video
                    src={previewUrl}
                    className="w-full h-full object-cover pointer-events-none"
                    muted
                    autoPlay
                    loop
                    playsInline
                  />
                )}
              </button>
              {isCustom && (
                <button
                  onClick={() => handleRemove(bg.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/80 text-white text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                  title="Remove"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
        <button
          onClick={() => fileRef.current?.click()}
          className="aspect-video rounded-lg border-2 border-dashed border-white/20 hover:border-white/50 flex items-center justify-center text-white/50 hover:text-white/80 text-xs transition"
        >
          + Upload
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <p className="text-white/40 text-xs">
        Upload your own image, GIF, or video to study with (max {MAX_FILE_MB}MB image, {MAX_VIDEO_FILE_MB}MB video).
      </p>
    </div>
  )
}
