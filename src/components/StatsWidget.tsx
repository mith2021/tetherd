import type { Stats } from '../types'

interface Props {
  stats: Stats
  accentColor: string
}

function toKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// heatmap grid only — surrounding summary numbers live in StatsDialog's tiles
export function StatsWidget({ stats, accentColor }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const byDay: Record<string, number> = {}
  for (const s of stats.sessions) byDay[s.date] = (byDay[s.date] ?? 0) + 1

  // 7x7 grid: last 49 days, oldest first, aligned to week columns like GitHub
  const start = new Date(today)
  start.setDate(start.getDate() - 48)
  // shift back to the previous Sunday so columns align to calendar weeks
  start.setDate(start.getDate() - start.getDay())

  const days: { date: Date; count: number }[] = []
  const cursor = new Date(start)
  while (cursor <= today) {
    days.push({ date: new Date(cursor), count: byDay[toKey(cursor)] ?? 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  const weeks: { date: Date; count: number }[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const maxCount = Math.max(1, ...days.map((d) => d.count))

  function opacityFor(count: number) {
    if (count === 0) return 0.06
    return 0.25 + 0.75 * (count / maxCount)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-[3px]">
        <div className="flex flex-col gap-[3px] pt-[14px] pr-1">
          {DAY_LABELS.map((l, i) => (
            <span key={i} className="text-[9px] text-white/30 h-[11px] leading-[11px]">
              {i % 2 === 1 ? l : ''}
            </span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => {
              const isToday = toKey(day.date) === toKey(today)
              return (
                <div
                  key={di}
                  title={`${day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${day.count} session${day.count === 1 ? '' : 's'}`}
                  className={`w-[11px] h-[11px] rounded-[2px] ${isToday ? 'ring-1 ring-white/60' : ''}`}
                  style={{ background: accentColor, opacity: opacityFor(day.count) }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
