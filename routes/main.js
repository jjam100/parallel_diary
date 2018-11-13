var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var app = express();
var moment = require('moment');
var utf8 = require('utf8');
var base64 = require('base-64');
var sha256 = require('sha256');
var session = require('express-session');
const functions = require('firebase-functions');
var admin = require('firebase-admin');

var serviceAccount = require("./path/serviceAccountKey.json")

// firebase admin 설정 초기화
admin.initializeApp({
  });

//세션 설정
app.use(session({
    secret: '@#$%fjdfghjkdlsayuiqefc@$#%', //랜덤 키보드캣(세션 변조)
    resave: false,
    saveUninitialized: true
}));

app.use(require('body-parser').json());

// 서울 시간 설정
require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");

// MYSQL 연결설정
var client = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: 'my_db'
});
client.connect();

// 메인페이지
router.get('/', function (req, res, next) {
    //session
    sess = req.session;
    console.log(sess);
    //redirect
    res.redirect("main/list");
});
router.get('/list', function (req, res, next) {
    //session
    var sess = req.session;
    var nickname = sess.nickname;
    var user_pid = sess.user_pid;
    console.log("유저번호 : " + user_pid);
    console.log(sess);
    if (nickname) {
        //main code

        let q = "SELECT DISTINCT\
        `user`.`nickname`,\
        `diary`.`diary_pid`,\
        `diary`.`date`,\
        `diary`.`text`,\
        `diary`.`img_url`,\
        `diary`.`is_deleted`,\
        `diary`.`user_pid`,\
        `diary`.`time`\
        FROM\
            `my_db`.`diary`,\
            `my_db`.`user`\
        WHERE\
            (`diary`.`user_pid` = `user`.`user_pid`\
                AND (`user`.`user_pid` =" + user_pid + "\
                OR `user`.`user_pid` = (SELECT `match` FROM (SELECT `match` FROM `my_db`.`user` WHERE `user_pid` =" + user_pid + ") tmp)))";




        client.query(q, function (err, row) {
            if (err) throw err;
            console.log(row);
            var base64 = require('base-64');
            row.forEach(e => {
                e.text = utf8.decode(base64.decode(e.text));
            });
            res.render('main/list', {
                title: "일기",
                row: row,
                nickname: utf8.decode(base64.decode(req.session.nickname)),
                user_pid: req.session.user_pid
            });
        })
    } else {
        res.redirect('../users/login');
    }
});

// 일기 작성
router.post('/create', function (req, res) {
    //응답을 받는 것이므로 res.body 를 사용해야 함.
    // 필수값 : user_pid, text, date
    var sess = req.session;
    console.log(sess);

    console.log()
    var couplePid = sess.couple_pid;
    var coupleUser = null;
    const msgTitle = utf8.decode(base64.decode(sess.nickname)) + '님이 새로운 글을 등록했습니다!';
    const msg = utf8.decode(base64.decode(sess.nickname)) + '님이 다이어리에 새로운 글을 등록했습니다. 확인해보세요!';
    console.log(couplePid + "  " + msgTitle + "  " + msg);
    let q = "INSERT INTO `my_db`.`diary` (`date`, `text`, `img_url`, `user_pid`)VALUES(";
    q += moment().format('YYYYMMDD') + ",'";
    q += base64.encode(utf8.encode(req.body.text)) + "','";
    q += req.body.img_url + "',";
    q += req.body.user_pid;
    q += ")";
    console.log(q);
    client.query(q, function (err, row) {
        if (err) throw err;
        let p = "SELECT `token` FROM `my_db`.`user` WHERE `user_pid` = " + couplePid;
        client.query(p, function (err, row) {
            if (err) throw err;
            coupleUser = row[0].token;
            if (coupleUser == null) {
                console.log("커플 상대 토큰정보 없음. -- 브라우저 알람 차단")
            } else{
                const payload = {
                    notification: {
                        title: msgTitle,
                        body: msg,
                        sound: 'default',
                        click_action: 'http://127.0.0.1:52273',
                        icon: '\/icons/android-icon-192x192.png'
                    }
                };
                admin.messaging().sendToDevice(coupleUser, payload).then(response => {
                    response.results.forEach((result, index) => {
                        const error = result.error;
                        if (error) {
                            console.error('FCM 실패 : ', error.code);
                        } else {
                            console.log('FCM 성공');
                        }
                    });
                });
            }
        });
    });
    res.redirect("./list");
})

// 일기 삭제
router.post('/destroy', function (res, req) {
    //응답을 받는 것이므로 res.body 를 사용해야 함.
    let q = "UPDATE `diary` SET `is_deleted` = true WHERE (`diary_pid` = '" + res.body.destroy_id + "');";
    console.log(res.body);
    client.query(q, function (err, row) {
        if (err) throw err;
    });
    req.redirect("back");
})

// 일기 수정
router.post('/update', function (res, req) {
    //응답을 받는 것이므로 res.body 를 사용해야 함.
    let q = "UPDATE `diary` SET `text` = '" + base64.encode(utf8.encode(res.body.text)) + "' WHERE (`diary_pid` = '" + res.body.update_id + "');";
    client.query(q, function (err, row) {
        if (err) {
            console.log(q + ":" + err);
            throw err;
        }
    });
    req.redirect("back");
});

// 유저 토큰값 추가
router.post('/updateToken', function (req, res, next) {
    //session
    var sess = req.session;
    console.log('userToken:', Object.keys(req.body)[0]);
    var token = Object.keys(req.body)[0];
    let q = "UPDATE `my_db`.`user`\
    SET `token` = NULL\
    WHERE `user_pid` = (\
    SELECT `user_pid`\
    FROM (\
    SELECT `user_pid`\
    FROM `my_db`.`user`\
    WHERE `token` = \'" + token + "\') tmp)"
    client.query(q, function (err, row) {
        console.log(sess.user_pid);
        if(err) {
            console.log("토큰값 추가 실패1 : " + err);
            throw err;
        }
        let p = "UPDATE `my_db`.`user` SET `token` = \'" + token + "\' WHERE `user_pid` =" + sess.user_pid;
        client.query(p,function(err,row){
            if(err) {
                console.log("토큰값 추가 실패2 : " + err);
                throw err;
            }
            console.log("토큰값 추가 성공2 : " + p);
        });
        console.log("토큰값 추가 성공1 : " + q);
    });
    res.json(req.body);
});

// 커플 요청
router.get('/coupleReq', function (req, res, next) {
    var sess = req.session;
    var nickname = sess.nickname;
    var user_pid = sess.user_pid;
    console.log("유저번호 : " + user_pid);
    if (nickname) {
        res.render('main/coupleReq', {
            title: '커플요청',
            error : 0
        });
    } else {
        res.redirect('../users/login');
    }
})

// 커플 요청 푸시알람
router.post('/coupleMsg', function (req, res, next) {
    //session
    var sess = req.session;
    if(req.body.couplePid == sess.user_pid){
        res.render('main/coupleReq', {
            title: '커플요청',
            error : 1
        });
    } else {
        var coupleUser = null;
        const couplePid = req.body.couplePid;
        const msgTitle = utf8.decode(base64.decode(sess.nickname)) + '님으로부터의 커플 요청이 도착했습니다.';
        const msg = utf8.decode(base64.decode(sess.nickname)) + '님이 회원님을 커플로 등록하기를 요청했습니다. 수락하시겠습니까?';
        console.log(couplePid + "  " + msgTitle + "  " + msg);
        let q = "SELECT `nickname`, `token` FROM `my_db`.`user` WHERE `user_pid` =" + couplePid;
        client.query(q, function (err, row) {
            if (err) throw err;
            console.log('닉네임 : ' + row[0].nickname + '토큰 : ' + row[0].token + " " + row[0].length);
            coupleUser = row[0].token;
            if (coupleUser == null) {
                res.render('main/coupleReq', {
                    title: '커플요청',
                    error : 2
                });
            } else {
                const payload = {
                    notification: {
                        title: msgTitle,
                        body: msg,
                        sound: 'default',
                        click_action: 'http://127.0.0.1:52273',
                        icon: '\/icons/android-icon-192x192.png'
                    }
                };
                admin.messaging().sendToDevice(coupleUser, payload).then(response => {
                    response.results.forEach((result, index) => {
                        const error = result.error;
                        if (error) {
                            console.error('FCM 실패 : ', error.code);
                        } else {
                            console.log('FCM 성공');
                        }
                    });
                });
                res.redirect('coupleReq');
            }
        });
    }
});

module.exports = router;