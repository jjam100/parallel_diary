// 오프라인 페이지를 위한 서비스 워커
 
// 설치 단계에서는 캐시에 오프라인 페이지를 설정하고 새 캐시를 오픈한다.
self.addEventListener('install', function(event) {
  var offlinePage = new Request('offline.html');
  event.waitUntil(
    fetch(offlinePage).then(function(response) {
      return caches.open('pwabuilder-offline').then(function(cache) {
        console.log('[PWA Builder] Cached offline page during Install'+ response.url);
        return cache.put(offlinePage, response);
      });
  }));
});

// 패치에 실패하면, 즉 오프라인 상태일때 오프라인 페이지가 표시된다.
// 오프라인 페이지는 html 문서로 작성해야만 한다....?
self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request).catch(function(error) {
      console.error( '[PWA Builder] Network request Failed. Serving offline page ' + error );
      return caches.open('pwabuilder-offline').then(function(cache) {
        return cache.match('offline.html');
      });
    }
  ));
});

// 페이지가 fire되었을떄 일어나는 이벤트. 서비스 워커에게 오프라인 페이지를 업데이트하도록 한다.
self.addEventListener('refreshOffline', function(response) {
  return caches.open('pwabuilder-offline').then(function(cache) {
    console.log('[PWA Builder] Offline page updated from refreshOffline event: '+ response.url);
    return cache.put(offlinePage, response);
  });
});