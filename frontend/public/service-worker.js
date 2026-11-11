const CACHE='ngoi-nha-nho-shell-v1';
self.addEventListener('install',event=>event.waitUntil((async()=>{const list=await fetch('/precache-assets.json',{cache:'no-store'}).then(r=>r.json());const cache=await caches.open(CACHE);await cache.addAll(['/',...list]);await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('ngoi-nha-nho-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api'))return;
 if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('/')));
 else event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
