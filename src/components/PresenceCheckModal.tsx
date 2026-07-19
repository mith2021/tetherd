import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { DialogRoot } from '@base-ui/react/dialog'

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

  // must be confirmed or let the grace period time out — never dismissed for free via
  // Escape/outside-click, since that would silently discard the session either way
  function handleOpenChange(open: boolean, eventDetails: DialogRoot.ChangeEventDetails) {
    if (!open) eventDetails.cancel()
  }

  return (
    <Dialog open modal disablePointerDismissal onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-transparent ring-0 p-0 shadow-none max-w-sm"
      >
        <div className="glass rounded-3xl px-10 py-8 flex flex-col items-center gap-4 text-center">
          <span className="text-5xl">👋</span>
          <h2 className="text-xl font-semibold text-white">Still there?</h2>
          <p className="text-white/60 text-sm">
            Your focus session finished. Confirm you're around or this session won't be counted.
          </p>
          <button
            onClick={onConfirm}
            autoFocus
            className="mt-2 px-8 py-3 rounded-full bg-white text-black font-medium hover:brightness-90 transition"
          >
            I'm here ({secondsLeft}s)
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
