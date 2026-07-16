import type { SessionType } from '../types'

interface Props {
  secondsLeft: number
  totalSeconds: number
  sessionType: SessionType
  accentColor: string
  running: boolean
  onStart: () => void
  onPause: () => void
  onSkip: () => void
}

const LABELS: Record<SessionType, string> = {
  focus: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
}

export function PipTimerView({
  secondsLeft,
  totalSeconds,
  sessionType,
  accentColor,
  running,
  onStart,
  onPause,
  onSkip,
}: Props) {
  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const progress = 1 - secondsLeft / totalSeconds
  const size = 96
  const center = size / 2
  const radius = 42
  const circumference = 2 * Math.PI * radius

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
        height: '100%',
        fontFamily: 'system-ui, sans-serif',
        color: 'white',
        userSelect: 'none',
      }}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={accentColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>
      </div>

      <span style={{ fontSize: 11, opacity: 0.6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {LABELS[sessionType]}
      </span>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={running ? onPause : onStart}
          style={{
            background: running ? 'rgba(255,255,255,0.15)' : accentColor,
            color: 'white',
            border: 'none',
            borderRadius: 999,
            padding: '6px 16px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={onSkip}
          style={{
            background: 'transparent',
            color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 999,
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Skip
        </button>
      </div>
    </div>
  )
}
