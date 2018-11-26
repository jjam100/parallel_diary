importScripts('https://www.gstatic.com/firebasejs/5.5.2/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/5.5.2/firebase-messaging.js');

firebase.initializeApp({
    apiKey: "AIzaSyBuJuuw6DvZOvxxYr-CooW7hMoxBy80Nd8",
    authDomain: "parallel-diary.firebaseapp.com",
    databaseURL: "https://parallel-diary.firebaseio.com",
    projectId: "parallel-diary",
    storageBucket: "parallel-diary.appspot.com",    
    'messagingSenderId': '1068220114920' //이곳은 자신의 프로젝트 설정 => 클라우드 메세징 => 발신자ID를 기입
});

const messaging = firebase.messaging();

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

self.addEventListener('notificationclick', function(event) {
    console.log(event.notification);
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data)
    );
});

console.log('[FCM Builder] active service worker found, no need to register');