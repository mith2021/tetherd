import { useEffect, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'

const THRESHOLDS = [3, 7, 14, 30, 100]
const DISMISS_MS = 5000

// fires once per streak threshold crossed, ever — tracked by the highest threshold
// already celebrated so a streak reset-then-regrown to the same number doesn't re-fire,
// and so it survives reloads mid-way through a session
export function useMilestoneToast(currentStreak: number) {
  const [highestCelebrated, setHighestCelebrated] = useLocalStorage('pomo-milestone-celebrated', 0)
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null)

  useEffect(() => {
    const next = THRESHOLDS.find((t) => t <= currentStreak && t > highestCelebrated)
    if (next == null) return
    setHighestCelebrated(next)
    setActiveMilestone(next)
    const id = setTimeout(() => setActiveMilestone(null), DISMISS_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStreak, highestCelebrated])

  return activeMilestone
}
