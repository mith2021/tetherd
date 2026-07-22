import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { mirrorGet, mirrorSet } from '../lib/stateMirror'

const BACKUP_SUFFIX = '__backup'

// Writes, then reads back to confirm the browser actually committed it (quota
// eviction and private-mode storage can silently no-op a setItem). One retry,
// then mirrors to a shadow key so a single corrupted/cleared key can't erase
// history — read side falls back to the shadow copy if the primary is bad.
// Also fires a fire-and-forget IndexedDB mirror write for extra redundancy —
// localStorage's synchronous write above is what actually guarantees
// durability against a reload racing the write; IndexedDB is a bonus copy.
function persist<T>(key: string, value: T) {
  const serialized = JSON.stringify(value)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      localStorage.setItem(key, serialized)
      if (localStorage.getItem(key) === serialized) break
    } catch {
      // storage full or unavailable — retry once, then give up on the primary key
    }
  }
  try {
    localStorage.setItem(key + BACKUP_SUFFIX, serialized)
  } catch {
    // best-effort — primary write above is the one that matters
  }
  mirrorSet(key, serialized)
}

function loadWithFallback<T>(key: string, initial: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    // primary key missing/corrupted — fall through to backup
  }
  try {
    const backup = localStorage.getItem(key + BACKUP_SUFFIX)
    if (backup) return JSON.parse(backup) as T
  } catch {
    // backup also unusable
  }
  return initial
}

// Persists synchronously inside the setState call (not a useEffect) so a
// reload/close immediately after the state update — e.g. a focus session
// completing right as the tab closes — can't race an effect that never runs.
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => loadWithFallback(key, initial))
  const hydratedFromMirror = useRef(false)

  // Both localStorage keys missing/corrupted (e.g. user cleared site data in
  // one storage partition but not another, or a corrupted primary+backup) —
  // last-resort async recovery from the IndexedDB mirror. Only overwrites
  // state if it's still the caller-supplied initial value, so this can't
  // clobber a legitimate write that happened between mount and this resolving.
  useEffect(() => {
    const raw = localStorage.getItem(key) ?? localStorage.getItem(key + BACKUP_SUFFIX)
    if (raw || hydratedFromMirror.current) return
    mirrorGet(key).then((mirrored) => {
      if (!mirrored || hydratedFromMirror.current) return
      hydratedFromMirror.current = true
      try {
        const parsed = JSON.parse(mirrored) as T
        setValue(parsed)
        persist(key, parsed)
      } catch {
        // corrupted mirror copy too — nothing left to recover from
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const setAndPersist: Dispatch<SetStateAction<T>> = useCallback(
    (next) => {
      hydratedFromMirror.current = true
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        persist(key, resolved)
        return resolved
      })
    },
    [key],
  )

  return [value, setAndPersist] as const
}
