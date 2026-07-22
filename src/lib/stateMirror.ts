// Background IndexedDB mirror of useLocalStorage state. localStorage stays the
// durability guarantee (synchronous write, same tick as the state change) —
// this is a redundant copy for extra capacity/corruption resistance, written
// fire-and-forget so it never gates or slows the synchronous path.
const DB_NAME = 'pomodoro-state-mirror'
const STORE = 'kv'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function mirrorSet(key: string, serializedValue: string) {
  openDb()
    .then(
      (db) =>
        new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE, 'readwrite')
          tx.objectStore(STORE).put(serializedValue, key)
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        }),
    )
    .catch(() => {
      // best-effort mirror — localStorage write already succeeded, this is just extra redundancy
    })
}

export function mirrorGet(key: string): Promise<string | undefined> {
  return openDb().then(
    (db) =>
      new Promise<string | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const req = tx.objectStore(STORE).get(key)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}
