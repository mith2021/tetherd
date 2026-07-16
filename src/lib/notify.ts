export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function notifySessionComplete() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  new Notification('Focus session complete', {
    body: "Still there? Confirm in the app or this session won't be counted.",
    icon: '/icon-192.png',
    tag: 'pomo-session-complete',
  })
}
