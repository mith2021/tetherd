import { useState } from 'react'
import type { Task } from '../types'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  activeTaskId: string | null
  setActiveTaskId: (id: string | null) => void
  onTaskCompleted?: () => void
  accentColor: string
  showTags?: boolean
}

// Deterministic tag color so the same subject text always gets the same hue,
// without a color picker or any new persisted config.
function tagHue(text: string) {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  return hash % 360
}

export function TaskList({ tasks, setTasks, activeTaskId, setActiveTaskId, onTaskCompleted, accentColor, showTags = true }: Props) {
  const [title, setTitle] = useState('')
  const [project, setProject] = useState('')
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [tagDraft, setTagDraft] = useState('')

  function addTask() {
    const trimmed = title.trim()
    if (!trimmed) return
    const task: Task = {
      id: crypto.randomUUID(),
      title: trimmed,
      targetPomodoros: 1,
      completedPomodoros: 0,
      done: false,
      project: project.trim() || undefined,
    }
    setTasks((prev) => [...prev, task])
    if (!activeTaskId) setActiveTaskId(task.id)
    setTitle('')
    setProject('')
  }

  function startEditingTag(task: Task) {
    setEditingTagId(task.id)
    setTagDraft(task.project ?? '')
  }

  function commitTag(id: string) {
    const trimmed = tagDraft.trim()
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, project: trimmed || undefined } : t)))
    setEditingTagId(null)
    setTagDraft('')
  }

  function toggleDone(id: string) {
    const task = tasks.find((t) => t.id === id)
    if (task && !task.done) onTaskCompleted?.()
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    if (activeTaskId === id) setActiveTaskId(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="What are you working on?"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
        {showTags && (
          <Input
            value={project}
            onChange={(e) => setProject(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Subject"
            aria-label="Subject (optional)"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 w-24 shrink-0"
          />
        )}
        <Button onClick={addTask} variant="secondary" disabled={!title.trim()}>
          Add
        </Button>
      </div>

      <ul className="space-y-1.5 max-h-64 overflow-y-auto">
        {tasks.map((task) => (
          <li
            key={task.id}
            onClick={() => setActiveTaskId(task.id)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition group hover:bg-white/5"
            style={activeTaskId === task.id ? { background: `${accentColor}26`, borderLeft: `2px solid ${accentColor}` } : undefined}
          >
            <Checkbox
              checked={task.done}
              onCheckedChange={() => toggleDone(task.id)}
              onClick={(e) => e.stopPropagation()}
              className="border-white/50 bg-white/10 data-checked:border-transparent data-checked:text-black"
              style={task.done ? { background: accentColor } : undefined}
            />
            <span className={`flex-1 text-sm truncate ${task.done ? 'line-through text-white/40' : 'text-white/90'}`}>
              {task.title}
            </span>
            {showTags && (
              editingTagId === task.id ? (
                <input
                  autoFocus
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitTag(task.id)
                    if (e.key === 'Escape') setEditingTagId(null)
                  }}
                  onBlur={() => commitTag(task.id)}
                  placeholder="Subject"
                  aria-label="Edit subject tag"
                  className="w-16 h-5 px-1.5 rounded-full bg-white/10 border border-white/20 text-white text-[11px] outline-none shrink-0"
                />
              ) : task.project ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    startEditingTag(task)
                  }}
                  title="Edit subject tag"
                  className="px-2 py-0.5 rounded-full text-[11px] shrink-0 max-w-20 truncate"
                  style={{ background: `hsl(${tagHue(task.project)} 70% 55% / 0.22)`, color: `hsl(${tagHue(task.project)} 85% 78%)` }}
                >
                  {task.project}
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    startEditingTag(task)
                  }}
                  title="Add subject tag"
                  aria-label="Add subject tag"
                  className="px-2 py-0.5 rounded-full text-[11px] shrink-0 text-white/0 group-hover:text-white/40 hover:text-white/70 transition border border-transparent hover:border-white/15"
                >
                  + tag
                </button>
              )
            )}
            <span className="text-xs text-white/40 tabular-nums">
              {task.completedPomodoros}/{task.targetPomodoros}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                removeTask(task.id)
              }}
              title="Remove task"
              aria-label="Remove task"
              className="w-6 h-6 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/15 text-base transition shrink-0"
            >
              ×
            </button>
          </li>
        ))}
        {tasks.length === 0 && <p className="text-white/40 text-sm py-4 text-center">No tasks yet.</p>}
      </ul>
    </div>
  )
}
