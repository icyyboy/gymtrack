/* GymTrack service worker
   - Cachea el shell para que la app abra sin conexion.
   - Las peticiones a Supabase siempre van a la red: los datos del
     entrenamiento no se sirven de cache.
   - El listener 'push' ya esta preparado para Web Push.
*/
const CACHE = 'gymtrack-v1'
const SHELL = ['/', '/dashboard', '/manifest.webmanifest', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(request, copy))
        return response
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/dashboard')))
  )
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  const payload = (() => {
    try {
      return event.data.json()
    } catch {
      return { title: 'GymTrack', body: event.data.text() }
    }
  })()

  event.waitUntil(
    self.registration.showNotification(payload.title || 'GymTrack', {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/dashboard' }
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const client = clients.find((c) => c.url.includes(url))
      if (client) return client.focus()
      return self.clients.openWindow(url)
    })
  )
})
