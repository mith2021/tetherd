import { useLocalStorage } from './useLocalStorage'

export interface WidgetPosition {
  x: number
  y: number
}

export interface WidgetSize {
  width: number
  height: number
}

export type WidgetLayout = Record<string, WidgetPosition | null>
export type WidgetSizes = Record<string, WidgetSize | null>

export interface SavedLayout {
  layout: WidgetLayout
  sizes: WidgetSizes
}

// null position = widget stays in normal responsive flow. A position is only set
// once the user actually drags a widget, at which point it detaches into fixed placement.
// null size = widget uses its natural/default size. Size and position are tracked independently
// so resizing doesn't force a widget out of flow layout.
export function useWidgetLayout(ids: string[]) {
  const empty = Object.fromEntries(ids.map((id) => [id, null])) as WidgetLayout
  const emptySizes = Object.fromEntries(ids.map((id) => [id, null])) as WidgetSizes
  const [layout, setLayout] = useLocalStorage<WidgetLayout>('pomo-widget-layout-v2', empty)
  const [sizes, setSizes] = useLocalStorage<WidgetSizes>('pomo-widget-sizes-v1', emptySizes)
  const [savedLayouts, setSavedLayouts] = useLocalStorage<Record<string, SavedLayout>>('pomo-saved-layouts', {})

  function setPosition(id: string, pos: WidgetPosition) {
    setLayout((prev) => ({ ...prev, [id]: pos }))
  }

  function setSize(id: string, size: WidgetSize) {
    setSizes((prev) => ({ ...prev, [id]: size }))
  }

  function resetLayout() {
    setLayout(empty)
    setSizes(emptySizes)
  }

  function saveLayoutAs(name: string) {
    setSavedLayouts((prev) => ({ ...prev, [name]: { layout, sizes } }))
  }

  function applyLayout(name: string) {
    const saved = savedLayouts[name]
    if (!saved) return
    setLayout(saved.layout)
    setSizes(saved.sizes)
  }

  function deleteLayout(name: string) {
    setSavedLayouts((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const isCustomized = ids.some((id) => layout[id] != null || sizes[id] != null)

  return {
    layout,
    sizes,
    setPosition,
    setSize,
    resetLayout,
    isCustomized,
    savedLayouts,
    saveLayoutAs,
    applyLayout,
    deleteLayout,
  }
}
