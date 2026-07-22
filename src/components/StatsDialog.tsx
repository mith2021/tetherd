import { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { SessionRecord, Stats } from '../types'
import { StatsWidget } from './StatsWidget'
import {
  sessionsInRange,
  totalFocusedSeconds,
  bestSessionSeconds,
  hourlyBuckets,
  calculateStreaks,
  formatDuration,
  formatMinutes,
} from '../lib/statsCompute'

interface Props {
  stats: Stats
  accentColor: string
  trigger: React.ReactElement
}

type Range = 'today' | 'week' | 'month'

function toKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

function StatTile({
  icon,
  label,
  value,
  title,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  title?: string
}) {
  return (
    <div className="glass rounded-2xl p-4 space-y-3" title={title}>
      <div className="text-white/50">{icon}</div>
      <div>
        <p className="text-sm text-white/60">{label}</p>
        <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      </div>
    </div>
  )
}

function formatHour(hour: number) {
  const period = hour < 12 ? 'AM' : 'PM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:00 ${period}`
}

function ReviewSessionsList({ sessions }: { sessions: SessionRecord[] }) {
  if (sessions.length === 0) {
    return <p className="text-white/50 text-sm text-center py-8">No sessions logged yet.</p>
  }

  const byDate = new Map<string, SessionRecord[]>()
  for (const s of sessions) {
    if (!byDate.has(s.date)) byDate.set(s.date, [])
    byDate.get(s.date)!.push(s)
  }
  const sortedDates = [...byDate.keys()].sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
      {sortedDates.map((date) => {
        const daySessions = byDate.get(date)!.slice().sort((a, b) => b.startHour - a.startHour)
        const dayTotal = daySessions.reduce((sum, s) => sum + s.durationSec, 0)
        return (
          <div key={date} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-white">
                {new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <span className="text-xs text-white/50">{formatDuration(dayTotal)} total</span>
            </div>
            <div className="glass rounded-xl divide-y divide-white/10">
              {daySessions.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-white/80">{formatHour(s.startHour)}</span>
                  <span className="text-white/50 tabular-nums">{formatMinutes(s.durationSec)}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function StatsDialog({ stats, accentColor, trigger }: Props) {
  const [range, setRange] = useState<Range>('today')
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const rangeStart = new Date(today)
  if (range === 'week') rangeStart.setDate(rangeStart.getDate() - 6)
  if (range === 'month') rangeStart.setDate(rangeStart.getDate() - 29)
  const rangeStartKey = range === 'today' ? toKey(selectedDate) : toKey(rangeStart)
  const rangeEndKey = range === 'today' ? toKey(selectedDate) : toKey(today)

  const inRange = sessionsInRange(stats.sessions, rangeStartKey, rangeEndKey)
  const totalSessions = inRange.length
  const focusedSeconds = totalFocusedSeconds(inRange)
  const bestSeconds = bestSessionSeconds(inRange)
  const tasksCompleted = Object.entries(stats.tasksCompletedByDay)
    .filter(([date]) => date >= rangeStartKey && date <= rangeEndKey)
    .reduce((sum, [, count]) => sum + count, 0)
  const streaks = calculateStreaks(stats.sessions)

  const selectedDateKey = toKey(selectedDate)
  const dayTotalSeconds = totalFocusedSeconds(sessionsInRange(stats.sessions, selectedDateKey, selectedDateKey))
  const buckets = hourlyBuckets(stats.sessions, selectedDateKey)
  const maxBucket = Math.max(1, ...buckets)

  function shiftDay(delta: number) {
    setSelectedDate((prev) => {
      const next = new Date(prev)
      next.setDate(next.getDate() + delta)
      return next
    })
  }

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="glass-dark border-white/10 text-white sm:max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl">
        <Tabs defaultValue="analytics">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold">Activities summary</h2>
          </div>

          <TabsList className="bg-white/5">
            <TabsTrigger value="analytics" className="text-white/60 data-active:text-white data-active:bg-white/15">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="review" className="text-white/60 data-active:text-white data-active:bg-white/15">
              Review Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-4 pt-4">
            <div className="glass-pill flex gap-1 p-1 rounded-full w-fit">
              {(['today', 'week', 'month'] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`text-xs px-3 py-1.5 rounded-full transition font-medium capitalize ${
                    range === r ? 'bg-white text-black' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {r === 'today' ? 'Today' : r === 'week' ? 'This week' : 'This month'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatTile
                icon={<BarIcon />}
                label="Total Sessions"
                value={totalSessions}
              />
              <StatTile
                icon={<ClockIcon />}
                label="Focused Time"
                value={formatDuration(focusedSeconds)}
              />
              <StatTile
                icon={<TrophyIcon />}
                label="Best Session"
                value={formatMinutes(bestSeconds)}
              />
              <StatTile
                icon={<CheckIcon />}
                label="Tasks completed"
                value={tasksCompleted}
              />
              <StatTile
                icon={<FlameIcon />}
                label="Streak"
                value={`${streaks.current}d`}
                title={`Longest streak: ${streaks.longest} day${streaks.longest === 1 ? '' : 's'}`}
              />
            </div>

            {range === 'today' ? (
              <div className="glass rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => shiftDay(-1)}
                      title="Previous day"
                      aria-label="Previous day"
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                    >
                      ‹
                    </button>
                    <span className="font-semibold text-sm">
                      {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <button
                      onClick={() => shiftDay(1)}
                      disabled={selectedDateKey >= toKey(today)}
                      title="Next day"
                      aria-label="Next day"
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition disabled:opacity-30"
                    >
                      ›
                    </button>
                  </div>
                  <span className="text-sm text-white/70">
                    Total Time: <span className="font-semibold text-white">{formatDuration(dayTotalSeconds)}</span>
                  </span>
                </div>

                <div className="flex items-end gap-[3px] h-24 pt-2">
                  {buckets.map((mins, hour) => (
                    <div
                      key={hour}
                      title={`${hour}:00 — ${Math.round(mins)}m`}
                      className="flex-1 rounded-t-sm transition-all"
                      style={{
                        height: `${Math.max(2, (mins / maxBucket) * 100)}%`,
                        background: mins > 0 ? accentColor : 'rgba(255,255,255,0.08)',
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-white/30">
                  <span>12AM</span>
                  <span>4AM</span>
                  <span>8AM</span>
                  <span>12PM</span>
                  <span>4PM</span>
                  <span>8PM</span>
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-4">
                <StatsWidget stats={stats} accentColor={accentColor} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="review" className="pt-4">
            <ReviewSessionsList sessions={stats.sessions} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function BarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20V10M18 20V4M6 20v-4" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
}
function FlameIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2c1 4-4 5-4 10a4 4 0 0 0 8 0c0-2-1-3-1-3s2 1 2 4a6 6 0 0 1-12 0c0-6 6-6 7-11z" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}
function TrophyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4a2 2 0 0 0 2 4M17 5h3a2 2 0 0 1-2 4" />
    </svg>
  )
}
