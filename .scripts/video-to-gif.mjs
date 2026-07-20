import ffmpegPath from 'ffmpeg-static'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const input = process.argv[2]
const output = process.argv[3] || 'docs/demo.gif'

if (!input || !fs.existsSync(input)) {
  console.error('Usage: node video-to-gif.mjs <input.webm> [output.gif]')
  process.exit(1)
}

const paletteFile = path.join(path.dirname(output), '.palette.png')

// two-pass palette gif: smooth 18fps, capped width, dithered — avoids the
// choppy/low-fps look of the old screenshot-stitched gif while staying small
const fps = 18
const width = 700
const maxColors = 160

execFileSync(ffmpegPath, [
  '-y', '-i', input,
  '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen=max_colors=${maxColors}:stats_mode=diff`,
  paletteFile,
])

execFileSync(ffmpegPath, [
  '-y', '-i', input, '-i', paletteFile,
  '-lavfi', `fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
  output,
])

fs.rmSync(paletteFile, { force: true })
console.log('GIF saved to', output)
