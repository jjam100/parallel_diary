// 오프라인 페이지를 위한 서비스 워커

// 캐싱할 모든 파일 리스트를 생성
var cacheName = 'paralleldiary';
var appShellFiles = [
  '/',
  '/css/materialize.css',
  '/css/base.css',
  '/js/materialize.js',
  '/js/jquery-3.3.1.min.js',
  '/icons/apple-icon-57x57.png',
  '/icons/apple-icon-60x60.png',
  '/icons/apple-icon-72x72.png',
  '/icons/apple-icon-76x76.png',
  '/icons/apple-icon-114x114.png',
  '/icons/apple-icon-120x120.png',
  '/icons/apple-icon-144x144.png',
  '/icons/apple-icon-152x152.png',
  '/icons/apple-icon-180x180.png',
  '/icons/android-icon-192x192.png',
  '/icons/ms-icon-144x144.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-96x96.png',
  '/icons/favicon-16x16.png',
  '/icons/favicon.ico'
]
 
// 설치 단계에서는 캐시에 오프라인 페이지를 설정하고 새 캐시를 오픈한다.
// 위의 목록에 포함된 파일을 캐싱
self.addEventListener('install', function(event) {
  var offlinePage = new Request('offline.html');
  event.waitUntil(
    // caches.open(cacheName).then(function(cache){
    //   console.log('[Service Worker] Caching all: app shell and contents');
    //   cache.addAll(appShellFiles);
    // })
    fetch(offlinePage).then(function(response) {
      return caches.open(cacheName).then(function(cache) {
        console.log('[PWA Builder] Cached offline page during Install'+ response.url);
        cache.addAll(appShellFiles);
        return cache.put(offlinePage, response);
      });
    })
  );
});

// 패치에 실패하면, 즉 오프라인 상태일때 오프라인 페이지가 표시된다.
// 오프라인 페이지는 html 문서로 작성해야만 한다....?
// 가능한 경우 캐시로부터 컨텐츠를 패치하여 오프라인 기능을 제공한다.
self.addEventListener('fetch', function(event) {
  event.respondWith(
    // caches.match(event.request).then(function(r) {
    //   console.log('[Service Worker] Fetching resource: '+event.request.url);
    //   return r || fetch(event.request).then(function(response) {
    //     return caches.open(cacheName).then(function(cache) {
    //       console.log('[Service Worker] Caching new resource: '+event.request.url);
    //       cache.put(event.request, response.clone());
    //       return response;
    //     });
    //   });
    // })
    fetch(event.request).catch(function(error) {
      console.error( '[PWA Builder] Network request Failed. Serving offline page ' + error );
      return caches.open(cacheName).then(function(cache) {
        return cache.match('offline.html');
      });
    })
  );
});
// self.addEventListener('fetch', function(event) {
//   event.respondWith(
//     // Try the cache
//     caches.match(event.request).then(function(response) {
//       if (response) {
//         return response;
//       }
//       return fetch(event.request).then(function(response) {
//         if (response.status === 404) {
//           return caches.match('pages/404.html');
//         }
//         return response
//       });
//     }).catch(function() {
//       // If both fail, show a generic fallback:
//       return caches.match('/offline.html');
//     })
//   );
// });

// 페이지가 fire되었을떄 일어나는 이벤트. 서비스 워커에게 오프라인 페이지를 업데이트하도록 한다.
self.addEventListener('refreshOffline', function(response) {
  return caches.open(cacheName).then(function(cache) {
    console.log('[PWA Builder] Offline page updated from refreshOffline event: '+ response.url);
    return cache.put(offlinePage, response);
  });
});

/*
// Push notification Service Worker
self.addEventListener('push', function(event) {
  // push listener
  var payload = event.data.json();
  const title = payload.title;
  const options = {
    body: payload.body,
    icon: '/icons/favicon.ico',
    badge: '/icons/apple-icon.png',
    vibrate: [200, 100, 200, 100, 200, 100, 400], // Mobile vibrate
    data: payload.params  // Notification next action parameter
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Push notification Click Listener
self.addEventListener('notificationclick', function(event) {
  var data = event.notification.data;
  event.notification.close(); // Close current notification
  event.waitUntil(clients.openWindow(data.url));
});
*/