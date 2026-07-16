import { useCallback, useEffect, useRef, useState } from 'react'

// Document Picture-in-Picture API (Chrome/Edge 116+). Not in TS lib types yet.
interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>
  window: Window | null
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture
  }
}

export function isPiPSupported() {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window
}

export function usePictureInPicture() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null)
  const closingRef = useRef(false)

  const open = useCallback(async () => {
    if (!isPiPSupported() || pipWindow) return
    const pipApi = window.documentPictureInPicture!
    const win = await pipApi.requestWindow({ width: 280, height: 200 })

    // copy stylesheets so Tailwind/glass styles render inside the PiP window
    ;[...document.styleSheets].forEach((sheet) => {
      try {
        const css = [...sheet.cssRules].map((r) => r.cssText).join('\n')
        const style = win.document.createElement('style')
        style.textContent = css
        win.document.head.appendChild(style)
      } catch {
        // cross-origin stylesheet, link it instead
        if (sheet.href) {
          const link = win.document.createElement('link')
          link.rel = 'stylesheet'
          link.href = sheet.href
          win.document.head.appendChild(link)
        }
      }
    })
    win.document.body.style.margin = '0'
    win.document.body.style.background = '#0f1115'

    closingRef.current = false
    win.addEventListener('pagehide', () => {
      if (!closingRef.current) setPipWindow(null)
    })

    setPipWindow(win)
  }, [pipWindow])

  const close = useCallback(() => {
    if (pipWindow) {
      closingRef.current = true
      pipWindow.close()
      setPipWindow(null)
    }
  }, [pipWindow])

  useEffect(() => {
    return () => {
      if (pipWindow) {
        closingRef.current = true
        pipWindow.close()
      }
    }
  }, [pipWindow])

  return { pipWindow, open, close, isOpen: pipWindow !== null }
}
