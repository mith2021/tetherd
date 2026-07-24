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
}

export function TaskList({ tasks, setTasks, activeTaskId, setActiveTaskId, onTaskCompleted, accentColor }: Props) {
  const [title, setTitle] = useState('')

  function addTask() {
    const trimmed = title.trim()
    if (!trimmed) return
    const task: Task = {
      id: crypto.randomUUID(),
      title: trimmed,
      targetPomodoros: 1,
      completedPomodoros: 0,
      done: false,
    }
    setTasks((prev) => [...prev, task])
    if (!activeTaskId) setActiveTaskId(task.id)
    setTitle('')
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
    <div className="flex flex-col gap-3 min-h-0 flex-1">
      <div className="flex gap-2 shrink-0">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="What are you working on?"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
        <Button onClick={addTask} variant="secondary" disabled={!title.trim()}>
          Add
        </Button>
      </div>

      <ul className="space-y-1.5 max-h-64 flex-1 min-h-0 overflow-y-auto">
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
