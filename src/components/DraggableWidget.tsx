import { useEffect, useRef, useState } from 'react'
import type { WidgetPosition, WidgetSize } from '../hooks/useWidgetLayout'

interface Props {
  id: string
  title: string
  position: WidgetPosition | null
  size: WidgetSize | null
  onMove: (pos: WidgetPosition) => void
  onResize: (size: WidgetSize) => void
  minimized?: boolean
  onToggleMinimize?: () => void
  minWidth?: number
  minHeight?: number
  children: React.ReactNode
  className?: string
}

// Widgets render in normal document flow until dragged; dragging detaches them into
// fixed pixel placement (clamped to viewport) so free positioning never breaks responsive layout.
// Size is tracked independently of position — resizing doesn't force a widget out of flow.
export function DraggableWidget({
  title,
  position,
  size,
  onMove,
  onResize,
  minimized = false,
  onToggleMinimize,
  minWidth = 220,
  minHeight = 120,
  children,
  className,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const justDraggedRef = useRef(false)

  // keep latest callbacks in refs so the window-listener effect below only mounts once —
  // re-subscribing mid-drag on every position/size update was dropping and reordering events
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove
  const onResizeRef = useRef(onResize)
  onResizeRef.current = onResize
  const minWidthRef = useRef(minWidth)
  minWidthRef.current = minWidth
  const minHeightRef = useRef(minHeight)
  minHeightRef.current = minHeight

  // Pointer capture is bound to window (not the element) so React re-renders mid-drag
  // (flow -> fixed position swap) never interrupt the drag sequence.
  useEffect(() => {
    function handleWindowMove(e: PointerEvent) {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startX
        const dy = e.clientY - dragRef.current.startY
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true
        const nextX = Math.min(window.innerWidth - 40, Math.max(0, dragRef.current.origX + dx))
        const nextY = Math.min(window.innerHeight - 40, Math.max(0, dragRef.current.origY + dy))
        onMoveRef.current({ x: nextX, y: nextY })
      }
      if (resizeRef.current) {
        const dx = e.clientX - resizeRef.current.startX
        const dy = e.clientY - resizeRef.current.startY
        const nextW = Math.max(minWidthRef.current, resizeRef.current.origW + dx)
        const nextH = Math.max(minHeightRef.current, resizeRef.current.origH + dy)
        onResizeRef.current({ width: nextW, height: nextH })
      }
    }
    function handleWindowUp() {
      // a real drag (moved past threshold) shouldn't also trigger the restore button's click
      justDraggedRef.current = dragRef.current?.moved ?? false
      dragRef.current = null
      resizeRef.current = null
      setDragging(false)
      setResizing(false)
    }
    function handleWindowCancel() {
      handleWindowUp()
    }
    window.addEventListener('pointermove', handleWindowMove)
    window.addEventListener('pointerup', handleWindowUp)
    window.addEventListener('pointercancel', handleWindowCancel)
    return () => {
      window.removeEventListener('pointermove', handleWindowMove)
      window.removeEventListener('pointerup', handleWindowUp)
      window.removeEventListener('pointercancel', handleWindowCancel)
    }
  }, [])

  function handlePointerDown(e: React.PointerEvent) {
    const target = e.target as HTMLElement
    if (target.closest('input, a, [role="slider"], [role="checkbox"], [role="switch"], [role="tab"], label')) return
    // minimized pill's restore button doubles as the drag handle: don't bail out on it,
    // just require actual movement before treating it as a drag (see handleWindowMove/Up)
    if (!minimized && target.closest('button')) return

    // first drag from flow mode: seed origin from current on-screen rect, not stored position
    const rect = wrapperRef.current?.getBoundingClientRect()
    const originX = position?.x ?? rect?.left ?? 0
    const originY = position?.y ?? rect?.top ?? 0

    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: originX, origY: originY, moved: false }
    setDragging(true)
  }

  function handleResizePointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    const rect = wrapperRef.current?.getBoundingClientRect()
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: size?.width ?? rect?.width ?? minWidth,
      origH: size?.height ?? rect?.height ?? minHeight,
    }
    setResizing(true)
  }

  const style: React.CSSProperties = position
    ? { position: 'fixed', left: position.x, top: position.y, zIndex: dragging || resizing ? 50 : 10 }
    : { position: 'relative', zIndex: dragging || resizing ? 50 : 'auto' }

  if (size && !minimized) {
    style.width = Math.max(minWidth, size.width)
    style.height = Math.max(minHeight, size.height)
  }

  if (minimized) {
    return (
      <div ref={wrapperRef} onPointerDown={handlePointerDown} className="cursor-grab" style={{ ...style, touchAction: 'none' }}>
        <button
          onClick={() => {
            if (justDraggedRef.current) return
            onToggleMinimize?.()
          }}
          className="glass-pill flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm hover:brightness-125 transition"
        >
          <span>{title}</span>
          <span className="text-white/50 text-xs">restore</span>
        </button>
      </div>
    )
  }

  return (
    <div
      ref={wrapperRef}
      onPointerDown={handlePointerDown}
      className={`group ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${className ?? ''}`}
      style={{ ...style, touchAction: 'none' }}
    >
      {onToggleMinimize && (
        <button
          onClick={onToggleMinimize}
          title={`Minimize ${title}`}
          aria-label={`Minimize ${title}`}
          className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/40 hover:bg-black/70 text-white/70 hover:text-white text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
        >
          &minus;
        </button>
      )}
      <div className="w-full h-full overflow-auto">{children}</div>
      <div
        onPointerDown={handleResizePointerDown}
        className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize opacity-0 group-hover:opacity-60 hover:opacity-100! transition"
        style={{ touchAction: 'none' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" className="text-white">
          <path d="M14 2L2 14M14 8L8 14M14 14L14 14" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  )
}
