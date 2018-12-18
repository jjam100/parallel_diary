importScripts('https://www.gstatic.com/firebasejs/5.5.2/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/5.5.2/firebase-messaging.js');

firebase.initializeApp({
    'messagingSenderId': '' //이곳은 자신의 프로젝트 설정 => 클라우드 메세징 => 발신자ID를 기입
});

self.addEventListener('push', function(event) {
    const payload = event.data.json();
    const title = payload.notification.title;
    const options = {
        body: payload.notification.body,
        icon: payload.notification.icon,
        data: payload.notification.click_action
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// const messaging = firebase.messaging();

// messaging.onMessage(function(event) {
//     const payload = event.data.json();
//     console.log('Message received. ', payload);
//     var notificationTitle = payload.notification.title;
//     var notificationOptions = {
//         body: payload.notification.body,
//         icon: payload.notification.icon,
//         data: payload.notification.click_action
//     };

//     return self.registration.showNotification(notificationTitle, notificationOptions);
// });

// messaging.setBackgroundMessageHandler(function(event) {
//     const payload = event.data.json();
//     console.log('[firebase-messaging-sw.js] Received background message ', payload);
//     // Customize notification here
//     var notificationTitle = payload.notification.title;
//     var notificationOptions = {
//         body: payload.notification.body,
//         icon: payload.notification.icon,
//         data: payload.notification.click_action
//     };

//     return self.registration.showNotification(notificationTitle, notificationOptions);
// });

// self.addEventListener('notificationclick', function(event) {
//     console.log(event.notification);
//     event.notification.close();
//     event.waitUntil(
//         clients.openWindow(event.notification.data)
//     );
// });

// console.log('[FCM Builder] active service worker found, no need to register');