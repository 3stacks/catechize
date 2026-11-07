// Review reminders. The generated service worker loads this file
// (vite.config.ts, workbox.importScripts). A push carries no data: count what
// is due from this device's own database and say so.

function countDue() {
  return new Promise((resolve) => {
    const open = indexedDB.open('catechize')
    open.onerror = () => resolve(0)
    open.onsuccess = () => {
      const db = open.result
      try {
        const req = db.transaction('cards').objectStore('cards').index('due').getAll(IDBKeyRange.upperBound(Date.now()))
        req.onsuccess = () => resolve(new Set(req.result.map((c) => c.unitId)).size)
        req.onerror = () => resolve(0)
      } catch {
        resolve(0)
      }
    }
  })
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    countDue().then((n) =>
      self.registration.showNotification('Hearers', {
        body: n ? `${n} ${n === 1 ? 'answer is' : 'answers are'} ready to review.` : 'Time for your daily review.',
        icon: 'icon.svg',
        tag: 'review',
        data: { url: new URL('./#/review', self.registration.scope).href },
      }),
    ),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? self.registration.scope
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.registration.scope))
      if (open) return open.navigate(url).then((c) => (c ?? open).focus())
      return self.clients.openWindow(url)
    }),
  )
})
