import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { SavedLayout } from '../hooks/useWidgetLayout'

interface Props {
  savedLayouts: Record<string, SavedLayout>
  onSave: (name: string) => void
  onApply: (name: string) => void
  onDelete: (name: string) => void
}

export function LayoutsMenu({ savedLayouts, onSave, onApply, onDelete }: Props) {
  const [name, setName] = useState('')
  const names = Object.keys(savedLayouts)

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed)
    setName('')
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button className="glass-pill text-sm text-white px-4 py-2 rounded-full hover:brightness-125 transition">
            Layouts
          </button>
        }
      />
      <PopoverContent
        side="top"
        className="bg-[#13141a]/95 backdrop-blur-2xl border border-white/10 text-white p-4 rounded-2xl shadow-2xl w-72"
      >
        <div className="space-y-3">
          <span className="text-sm font-medium text-white/80">Saved layouts</span>

          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Layout name"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 text-xs"
            />
            <Button onClick={handleSave} variant="secondary" size="sm">
              Save
            </Button>
          </div>

          {names.length > 0 ? (
            <ul className="space-y-1">
              {names.map((n) => (
                <li key={n} className="flex items-center gap-2 group">
                  <button
                    onClick={() => onApply(n)}
                    className="flex-1 text-left text-sm text-white/80 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/10 transition truncate"
                  >
                    {n}
                  </button>
                  <button
                    onClick={() => onDelete(n)}
                    className="w-6 h-6 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/15 transition shrink-0"
                    title="Delete layout"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-white/40 text-xs">
              Arrange your widgets, then save the arrangement here — handy for matching layouts to different
              wallpapers.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
