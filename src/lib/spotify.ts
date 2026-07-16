// Extracts a playlist/album/track ID from any Spotify share URL or URI so we can build an embed src.
// Accepts: https://open.spotify.com/playlist/{id}, spotify:playlist:{id}, with or without query params.
export function parseSpotifyUrl(input: string): { type: string; id: string } | null {
  const trimmed = input.trim()

  const uriMatch = trimmed.match(/^spotify:(playlist|album|track|artist):([a-zA-Z0-9]+)$/)
  if (uriMatch) return { type: uriMatch[1], id: uriMatch[2] }

  try {
    const url = new URL(trimmed)
    if (!url.hostname.includes('spotify.com')) return null
    const parts = url.pathname.split('/').filter(Boolean)
    const typeIdx = parts.findIndex((p) => ['playlist', 'album', 'track', 'artist'].includes(p))
    if (typeIdx === -1 || !parts[typeIdx + 1]) return null
    return { type: parts[typeIdx], id: parts[typeIdx + 1] }
  } catch {
    return null
  }
}

export function spotifyEmbedUrl(type: string, id: string) {
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`
}
