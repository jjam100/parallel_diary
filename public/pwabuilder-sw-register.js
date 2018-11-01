// 오프라인 페이지를 위한 서비스 워커

if (navigator.serviceWorker.controller) {
  console.log('[PWA Builder] active service worker found, no need to register')
} else {
  // 서비스워커 등록
  navigator.serviceWorker.register('pwabuilder-sw.js', {
    scope: './'
  }).then(function(reg) {
    console.log('[PWA Builder] Service worker has been registered for scope:'+ reg.scope);
  });
  // navigator.serviceWorker.register('firebase-messaging-sw.js', {
  //   scope: './'
  // }).then(function(reg) {
  //   console.log('[FCM Builder] Service worker has been registered for scope:'+ reg.scope);
  // });
}

