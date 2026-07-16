import { useRef } from 'react'

interface Props {
  imageUrl: string
  position: { x: number; y: number }
  onChange: (pos: { x: number; y: number }) => void
}

export function BackgroundPositionEditor({ imageUrl, position, onChange }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  function updateFromEvent(e: { clientX: number; clientY: number }) {
    const box = boxRef.current
    if (!box) return
    const rect = box.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100))
    onChange({ x: Math.round(x), y: Math.round(y) })
  }

  function handlePointerDown(e: React.PointerEvent) {
    dragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    updateFromEvent(e)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging.current) return
    updateFromEvent(e)
  }

  function handlePointerUp() {
    dragging.current = false
  }

  return (
    <div className="space-y-2">
      <div
        ref={boxRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full aspect-video rounded-lg overflow-hidden cursor-crosshair border border-white/10 touch-none"
        style={{
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: `${position.x}% ${position.y}%`,
        }}
      >
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${position.x}%`, top: `${position.y}%`, background: 'rgba(255,255,255,0.3)' }}
        />
      </div>
      <p className="text-white/40 text-xs">Drag to choose which part of the image shows behind the timer.</p>
    </div>
  )
}
