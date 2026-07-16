import type { SessionType } from '../types'

interface Props {
  secondsLeft: number
  totalSeconds: number
  sessionType: SessionType
  accentColor: string
  size?: number // ring diameter in px; digit/label sizing scales proportionally
  fontFamily?: string
}

const LABELS: Record<SessionType, string> = {
  focus: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
}

const BASE_SIZE = 440

export function TimerDisplay({
  secondsLeft,
  totalSeconds,
  sessionType,
  accentColor,
  size = BASE_SIZE,
  fontFamily = 'var(--font-timer)',
}: Props) {
  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const progress = 1 - secondsLeft / totalSeconds
  const scale = size / BASE_SIZE
  const center = size / 2
  const radius = 200 * scale
  const strokeWidth = Math.max(2, 5 * scale)
  const circumference = 2 * Math.PI * radius

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={accentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 0.3s linear' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="uppercase text-white/50"
          style={{ fontSize: 14 * scale, letterSpacing: '0.25em', marginBottom: 12 * scale }}
        >
          {LABELS[sessionType]}
        </span>
        <span
          className="leading-none font-semibold tabular-nums text-white"
          style={{ fontFamily, fontSize: 120 * scale }}
        >
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}
