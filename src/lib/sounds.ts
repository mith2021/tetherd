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

// Looping ambient noise beds, synthesized via WebAudio (no assets to host/license).
// Each track is a shared AudioContext + BufferSource(loop) -> filter -> gain -> destination,
// so multiple tracks can layer and each has an independent volume.
export type AmbientTrackId = 'rain' | 'brown' | 'white' | 'fire'

interface AmbientHandle {
  gain: GainNode
  stop: () => void
}

let sharedCtx: AudioContext | null = null
function getCtx() {
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new AudioContext()
  return sharedCtx
}

function noiseBuffer(ctx: AudioContext, colorize: (data: Float32Array) => void) {
  const length = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  colorize(data)
  return buffer
}

function startNoiseTrack(id: AmbientTrackId): AmbientHandle {
  const ctx = getCtx()
  const gain = ctx.createGain()
  gain.gain.value = 0
  gain.connect(ctx.destination)

  let buffer: AudioBuffer
  let filterFreq = 0

  if (id === 'white') {
    buffer = noiseBuffer(ctx, () => {})
  } else if (id === 'brown') {
    buffer = noiseBuffer(ctx, (data) => {
      let last = 0
      for (let i = 0; i < data.length; i++) {
        last = (last + 0.02 * data[i]) / 1.02
        data[i] = last * 3.5
      }
    })
  } else if (id === 'rain') {
    buffer = noiseBuffer(ctx, () => {})
    filterFreq = 4000
  } else {
    // fire: filtered brown noise with a lower cutoff for a low rumble/crackle feel
    buffer = noiseBuffer(ctx, (data) => {
      let last = 0
      for (let i = 0; i < data.length; i++) {
        last = (last + 0.05 * data[i]) / 1.05
        data[i] = last * 4
      }
    })
    filterFreq = 800
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  let lastNode: AudioNode = source
  if (filterFreq > 0) {
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = filterFreq
    source.connect(filter)
    lastNode = filter
  }
  lastNode.connect(gain)
  source.start()

  return {
    gain,
    stop: () => {
      try {
        source.stop()
      } catch {
        // already stopped
      }
      source.disconnect()
      gain.disconnect()
    },
  }
}

const activeTracks = new Map<AmbientTrackId, AmbientHandle>()

export function setAmbientTrackVolume(id: AmbientTrackId, volume: number) {
  if (volume <= 0) {
    activeTracks.get(id)?.stop()
    activeTracks.delete(id)
    return
  }
  let handle = activeTracks.get(id)
  if (!handle) {
    handle = startNoiseTrack(id)
    activeTracks.set(id, handle)
  }
  handle.gain.gain.value = volume
}

export function stopAllAmbientTracks() {
  for (const handle of activeTracks.values()) handle.stop()
  activeTracks.clear()
}
