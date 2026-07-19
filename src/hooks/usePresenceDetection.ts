import { useEffect, useRef, useState } from 'react'

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite'
const DETECT_INTERVAL_MS = 500

interface UsePresenceDetectionArgs {
  enabled: boolean
  active: boolean // only run while a focus session is actually running
  awayGraceSeconds: number
  onFaceLost: () => void
  onFacePresent: () => void
}

// On-device webcam face detection (MediaPipe FaceDetector, WASM) to auto-pause/resume
// focus sessions when the user leaves frame. Video never leaves the device — detection
// runs entirely in-browser. Camera only opens while enabled+active; torn down immediately
// otherwise so the camera light never stays on longer than needed.
export function usePresenceDetection({
  enabled,
  active,
  awayGraceSeconds,
  onFaceLost,
  onFacePresent,
}: UsePresenceDetectionArgs) {
  const [isWatching, setIsWatching] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const detectorRef = useRef<import('@mediapipe/tasks-vision').FaceDetector | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const noFaceSinceRef = useRef<number | null>(null)
  const wasAutoPausedRef = useRef(false) // only auto-resume a pause this hook itself caused

  const onFaceLostRef = useRef(onFaceLost)
  onFaceLostRef.current = onFaceLost
  const onFacePresentRef = useRef(onFacePresent)
  onFacePresentRef.current = onFacePresent

  useEffect(() => {
    if (!enabled || !active) {
      // not our job to resume here — only clean up. If we're leaving `active` while we'd
      // auto-paused, leave the pause as-is (session ending covers it either way).
      return
    }

    let cancelled = false

    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream

        const video = document.createElement('video')
        video.srcObject = stream
        video.muted = true
        video.playsInline = true
        await video.play()
        videoRef.current = video

        const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision')
        const fileset = await FilesetResolver.forVisionTasks(WASM_BASE)
        if (cancelled) return
        const detector = await FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: 'VIDEO',
        })
        if (cancelled) {
          detector.close()
          return
        }
        detectorRef.current = detector
        setCameraError(null)
        setIsWatching(true)

        intervalRef.current = setInterval(() => {
          const v = videoRef.current
          const d = detectorRef.current
          if (!v || !d || v.readyState < 2) return
          const result = d.detectForVideo(v, performance.now())
          const faceDetected = result.detections.length > 0

          if (faceDetected) {
            noFaceSinceRef.current = null
            if (wasAutoPausedRef.current) {
              wasAutoPausedRef.current = false
              onFacePresentRef.current()
            }
          } else {
            if (noFaceSinceRef.current == null) noFaceSinceRef.current = Date.now()
            const awaySec = (Date.now() - noFaceSinceRef.current) / 1000
            if (awaySec >= awayGraceSeconds && !wasAutoPausedRef.current) {
              wasAutoPausedRef.current = true
              onFaceLostRef.current()
            }
          }
        }, DETECT_INTERVAL_MS)
      } catch (err) {
        if (cancelled) return
        const message =
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Camera permission denied.'
            : err instanceof DOMException && err.name === 'NotFoundError'
              ? 'No camera found.'
              : 'Could not start camera-based presence detection.'
        setCameraError(message)
        setIsWatching(false)
      }
    }

    setup()

    return () => {
      cancelled = true
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      detectorRef.current?.close()
      detectorRef.current = null
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      videoRef.current = null
      noFaceSinceRef.current = null
      wasAutoPausedRef.current = false
      setIsWatching(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, active, awayGraceSeconds])

  return { isWatching, cameraError }
}
