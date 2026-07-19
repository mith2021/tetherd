import { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Stats, TimerSettings } from '../types'
import { StatsWidget } from './StatsWidget'
import {
  sessionsInRange,
  totalFocusedSeconds,
  bestSessionSeconds,
  hourlyBuckets,
  focusScoreStars,
  formatDuration,
  formatMinutes,
} from '../lib/statsCompute'

interface Props {
  stats: Stats
  settings: TimerSettings
  accentColor: string
  todayCount: number
  trigger: React.ReactElement
}

type Range = 'today' | 'week' | 'month'

function toKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="text-white/50">{icon}</div>
      <div>
        <p className="text-sm text-white/60">{label}</p>
        <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      </div>
    </div>
  )
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-1 text-lg">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < count ? 'text-white' : 'text-white/25'}>
          {i < count ? '★' : '☆'}
        </span>
      ))}
    </div>
  )
}

export function StatsDialog({ stats, settings, accentColor, todayCount, trigger }: Props) {
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
                icon={<FlameIcon />}
                label="Best Session"
                value={formatMinutes(bestSeconds)}
              />
              <StatTile
                icon={<CheckIcon />}
                label="Tasks completed"
                value={tasksCompleted}
              />
              <div className="glass rounded-2xl p-4 space-y-3 col-span-2">
                <div className="text-white/50">
                  <TargetIcon />
                </div>
                <div>
                  <p className="text-sm text-white/60">Focus Score</p>
                  <Stars count={focusScoreStars(todayCount, settings.dailySessionGoal)} />
                </div>
              </div>
            </div>

            {range === 'today' ? (
              <div className="glass rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => shiftDay(-1)}
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
            <p className="text-white/50 text-sm text-center py-8">Coming soon.</p>
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
function TargetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  )
}
