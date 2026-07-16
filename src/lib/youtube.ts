export interface YouTubeRef {
  videoId: string | null
  listId: string | null
}

// Extracts video and/or playlist IDs from any common YouTube URL shape.
export function parseYouTubeUrl(input: string): YouTubeRef | null {
  const trimmed = input.trim()
  try {
    const url = new URL(trimmed)
    let videoId: string | null = null
    if (url.hostname === 'youtu.be') {
      videoId = url.pathname.slice(1) || null
    } else if (url.hostname.includes('youtube.com')) {
      if (url.pathname === '/watch') videoId = url.searchParams.get('v')
      else if (url.pathname.startsWith('/embed/')) videoId = url.pathname.split('/')[2] || null
      else if (url.pathname.startsWith('/live/')) videoId = url.pathname.split('/')[2] || null
    } else {
      return null
    }
    const listId = url.searchParams.get('list')
    if (!videoId && !listId) return null
    return { videoId, listId }
  } catch {
    return null
  }
}

export function youtubeEmbedUrl(ref: YouTubeRef) {
  const params = new URLSearchParams({ autoplay: '1' })
  if (ref.listId) {
    // playlist embed: plays every video in the list, loops through it
    params.set('list', ref.listId)
    params.set('loop', '1')
    return `https://www.youtube.com/embed/${ref.videoId ?? ''}?${params}`
  }
  // single video: loop requires playlist param set to the same id
  params.set('loop', '1')
  params.set('playlist', ref.videoId!)
  return `https://www.youtube.com/embed/${ref.videoId}?${params}`
}
