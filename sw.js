// Service Worker – يجعل التطبيق يعمل بدون إنترنت بعد أول فتح
const VERSION = 'both-v3';
const CORE = `core-${VERSION}`, RUNTIME = `runtime-${VERSION}`;
const CORE_FILES = ['./', './index.html', './term2.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CORE).then(c => c.addAll(CORE_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => ![CORE, RUNTIME].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // الصفحة نفسها: الشبكة أولًا ثم النسخة المحفوظة
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const c = res.clone(); caches.open(CORE).then(k => k.put(req, c)); return res; }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  // باقي الملفات (three.js والخطوط والأيقونات): المحفوظ أولًا مع التحديث في الخلفية
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(RUNTIME).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
