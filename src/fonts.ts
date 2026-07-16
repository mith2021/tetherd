export interface TimerFont {
  id: string
  name: string
  family: string
}

// All imported in index.css via @fontsource-variable packages.
export const TIMER_FONTS: TimerFont[] = [
  { id: 'space-grotesk', name: 'Space Grotesk', family: "'Space Grotesk Variable', sans-serif" },
  { id: 'jetbrains-mono', name: 'JetBrains Mono', family: "'JetBrains Mono Variable', monospace" },
  { id: 'orbitron', name: 'Orbitron', family: "'Orbitron Variable', sans-serif" },
  { id: 'unbounded', name: 'Unbounded', family: "'Unbounded Variable', sans-serif" },
  { id: 'doto', name: 'Doto', family: "'Doto Variable', sans-serif" },
]

export function fontFamilyFor(id: string): string {
  return TIMER_FONTS.find((f) => f.id === id)?.family ?? TIMER_FONTS[0].family
}
