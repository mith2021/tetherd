import type { BackgroundOption } from '../types'

function toHex(n: number) {
  return Math.round(n).toString(16).padStart(2, '0')
}

// average pixel color from a downscaled canvas sample — fast, good enough for an accent
function averageFromCanvas(source: CanvasImageSource, sw: number, sh: number): string | null {
  const canvas = document.createElement('canvas')
  const size = 32 // small sample is plenty for an average and keeps this cheap
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx || sw === 0 || sh === 0) return null
  ctx.drawImage(source, 0, 0, sw, sh, 0, 0, size, size)
  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(0, 0, size, size).data
  } catch {
    return null // tainted canvas (cross-origin media) — can't sample
  }
  let r = 0
  let g = 0
  let b = 0
  let count = 0
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    if (alpha === 0) continue
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    count++
  }
  if (count === 0) return null
  r /= count
  g /= count
  b /= count
  // push toward a usable accent: boost saturation/brightness so flat/dark photos
  // don't produce a muddy near-black or near-gray color
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const boost = max - min < 20 ? 1.4 : 1.15
  const mid = (r + g + b) / 3
  r = Math.min(255, mid + (r - mid) * boost)
  g = Math.min(255, mid + (g - mid) * boost)
  b = Math.min(255, mid + (b - mid) * boost)
  const brightness = (r + g + b) / 3
  if (brightness < 90) {
    const lift = 90 / Math.max(brightness, 1)
    r = Math.min(255, r * lift)
    g = Math.min(255, g * lift)
    b = Math.min(255, b * lift)
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function firstGradientStop(css: string): string | null {
  const match = css.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/)
  return match ? match[0] : null
}

// resolves a representative accent color from whatever background is active —
// solid colors/gradients parse directly, images/gifs/videos get canvas-sampled
export async function dominantColorFor(bg: BackgroundOption, mediaUrl: string | undefined): Promise<string | null> {
  if (bg.kind === 'color') return bg.value
  if (bg.kind === 'gradient') return firstGradientStop(bg.value)

  const url = bg.kind === 'image' ? bg.value : mediaUrl
  if (!url) return null

  if (bg.kind === 'video') {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.muted = true
      video.playsInline = true
      video.src = url
      video.currentTime = 0.5
      const cleanup = () => {
        video.remove()
      }
      video.addEventListener(
        'loadeddata',
        () => {
          const result = averageFromCanvas(video, video.videoWidth, video.videoHeight)
          cleanup()
          resolve(result)
        },
        { once: true }
      )
      video.addEventListener(
        'error',
        () => {
          cleanup()
          resolve(null)
        },
        { once: true }
      )
    })
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(averageFromCanvas(img, img.naturalWidth, img.naturalHeight))
    img.onerror = () => resolve(null)
    img.src = url
  })
}
