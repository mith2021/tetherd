import { useEffect, useState } from 'react'
import { getMedia } from '../lib/mediaStore'
import type { BackgroundOption } from '../types'

// resolves IndexedDB blobs for custom backgrounds into object URLs, revoking stale ones
export function useBackgroundMedia(backgrounds: BackgroundOption[]) {
  const [urls, setUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    const created: string[] = []

    async function load() {
      const next: Record<string, string> = {}
      for (const bg of backgrounds) {
        if (bg.kind === 'gif' || bg.kind === 'custom' || bg.kind === 'video') {
          const blob = await getMedia(bg.id)
          if (blob && !cancelled) {
            const url = URL.createObjectURL(blob)
            next[bg.id] = url
            created.push(url)
          }
        }
      }
      if (!cancelled) setUrls(next)
    }
    load()

    return () => {
      cancelled = true
      created.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [backgrounds])

  return urls
}
