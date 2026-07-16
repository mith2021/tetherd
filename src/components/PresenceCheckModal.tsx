import { useEffect, useState } from 'react'

interface Props {
  graceSeconds: number
  onConfirm: () => void
  onTimeout: () => void
}

export function PresenceCheckModal({ graceSeconds, onConfirm, onTimeout }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(graceSeconds)

  useEffect(() => {
    if (secondsLeft <= 0) {
      onTimeout()
      return
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft, onTimeout])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Enter' || e.key === ' ') onConfirm()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onConfirm])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-3xl px-10 py-8 flex flex-col items-center gap-4 max-w-sm text-center">
        <span className="text-5xl">👋</span>
        <h2 className="text-xl font-semibold text-white">Still there?</h2>
        <p className="text-white/60 text-sm">
          Your focus session finished. Confirm you're around or this session won't be counted.
        </p>
        <button
          onClick={onConfirm}
          className="mt-2 px-8 py-3 rounded-full bg-white text-black font-medium hover:brightness-90 transition"
        >
          I'm here ({secondsLeft}s)
        </button>
      </div>
    </div>
  )
}
