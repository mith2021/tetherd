// All sounds generated via WebAudio — no external assets needed, always works offline.
function tone(freq: number, duration: number, volume: number) {
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration)
  osc.onended = () => ctx.close()
}

// session-complete chime (used by focus/break transitions and skip)
export function playAlertBeep() {
  tone(880, 0.6, 0.2)
}

// short, quiet clicks for direct user actions
export function playStartSound() {
  tone(660, 0.12, 0.12)
}

export function playPauseSound() {
  tone(440, 0.12, 0.12)
}

export function playResetSound() {
  tone(330, 0.15, 0.12)
}
