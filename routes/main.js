var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var app = express();
var moment = require('moment');
var utf8 = require('utf8');
var multer = require('multer');
var base64 = require('base-64');
var sha256 = require('sha256');
var session = require('express-session');
const functions = require('firebase-functions');
var admin = require('firebase-admin');
var path = require('path');
var fs = require('fs');

var serviceAccount = require("./path/serviceAccountKey.json")
var upload = multer({
    storage : multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, './public/images/uploads');
          },
        filename: function (req, file, cb) {
            //이미지 파일명은 "파일이름-날짜" 텍스트를 sha256 으로 암호화
            //패턴화된 이미지 파일명은 자칫하면 제3자에 의해 탈취될 가능성이 있음.
            let img_file_name = sha256(file.fieldname + '-' + Date.now());
            cb(null, img_file_name + path.extname(file.originalname))
        }
    })
  });

// firebase admin 설정 초기화
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://parallel-diary.firebaseio.com"
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
    password: '1q2w3e4r?',
    port: 3306,
    database: 'my_db',
    multipleStatements: true
});
client.connect();

// 메인페이지
router.get('/', function (req, res, next) {
    //session
    sess = req.session;
    //redirect
    res.redirect("main/list");
});
router.get('/list', function (req, res, next) {
    //session
    var sess = req.session;
    var nickname = sess.nickname;
    var user_pid = sess.user_pid;
    var e_mail = sess.e_mail;
    console.log("유저번호 : " + user_pid);
    console.log(sess);
    if (nickname) {
        //커플 인증
        let q = "SELECT `is_coupled` FROM `my_db`.`user` WHERE `user_pid` =" + user_pid;
        client.query(q, function (err, row) {
            if (err) throw err;
            if (row[0].is_coupled == null) {
                res.redirect('../users/usersetting');
            } else if (row[0].is_coupled == 0) {
                res.redirect('../users/usersetting')
            } else if (row[0].is_coupled == 2) {
                res.redirect('../users/usersetting')
            } else {
                //내부 쿼리 
                //`user`.`match`추가
                let p = "SELECT DISTINCT\
                `user`.`nickname`,\
                `user`.`match`,\
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
                client.query(p, function (err, row) {
                    if (err) throw err;
                    var base64 = require('base-64');
                    row.forEach(e => {
                        e.text = utf8.decode(base64.decode(e.text));
                        if(e.img_url != '') {
                            e.have_image = true;
                        }else {
                            e.have_image = false;
                        }
                    });
                    console.log(row);
                    // 삼중쿼리..... 후덜덜...
                    // 커플 닉네임을 받기위해서 쿼리 추가 : 홍진백
                    let r = "SELECT `nickname` FROM my_db.user WHERE `match` = '"+sess.user_pid+"';";
                    client.query(r, function (err, row2) {
                        let c_n = utf8.decode(base64.decode(row2[0].nickname));
                        res.render('main/list', {
                            title: "일기",
                            today:moment().format('YYYY-MM-DD'),
                            row: row,
                            couple: c_n,
                            e_mail: e_mail,
                            is_coupled: 1,
                            nickname: utf8.decode(base64.decode(req.session.nickname)),
                            user_pid: req.session.user_pid
                        });
                    });
                    
                })
            }
        });
    } else {
        res.redirect('../users/login');
    }
});

// 일기 작성
router.post('/create', upload.single('img_url'), function (req, res, err) {
    var FILE_SIZE = 1024 * 1024; //1MB 이미지 크기 제한
    //응답을 받는 것이므로 res.body 를 사용해야 함.
    // 필수값 : user_pid, text, date
    var sess = req.session;
    var couplePid = sess.couple_pid;
    var coupleUser = null;
    const msgTitle = utf8.decode(base64.decode(sess.nickname)) + '님이 새로운 글을 등록했습니다!';
    const msg = utf8.decode(base64.decode(sess.nickname)) + '님이 다이어리에 새로운 글을 등록했습니다. 확인해보세요!';
    console.log(couplePid + "  " + msgTitle + "  " + msg);
    
    //이미지 쿼리 처리 분기문
    let file_q;
    console.log(req.file);
    if(req.file) {
        if(req.file.size > FILE_SIZE) {
            console.log("pass : 이미지 크기나 넘 크다.");
            res.end("<meta charset='utf-8' />\
            <script>\
            window.onload = function(){\
            alert('이미지가 너무 큽니다!'); window.location.replace('/main/list');};\
            </script>");
        }
        else if(req.file.mimetype.indexOf('image') == -1) {
            console.log("pass : 이미지 확장자가 아니다.");
            res.end("<meta charset='utf-8' />\
            <script>\
            window.onload = function(){\
            alert('이미지만 올릴 수 있습니다!'); window.location.replace('/main/list');};\
            </script>");
        }
        else {
            console.log("pass : 파일이 정상적 업로드");
            file_q = '/images/uploads/' + req.file.filename;
            let q = "INSERT INTO `my_db`.`diary` (`date`, `text`, `img_url`, `user_pid`, `is_deleted`)VALUES('";
            q += moment().format('YYYY-MM-DD') + "','";
            q += base64.encode(utf8.encode(req.body.text)) + "','";
            q += file_q + "',";
            q += req.body.user_pid + ",";
            q += "0";
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
                                click_action: 'http://127.0.0.1:52273/main/list',
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
        }
    }
    else {
        console.log("pass : 파일이 아닌 글만 업로드");
        file_q = '';
        let q = "INSERT INTO `my_db`.`diary` (`date`, `text`, `img_url`, `user_pid`, `is_deleted`)VALUES('";
        q += moment().format('YYYY-MM-DD') + "','";
        q += base64.encode(utf8.encode(req.body.text)) + "','";
        q += file_q + "',";
        q += req.body.user_pid + ",";
        q += "0";
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
                            click_action: 'http://127.0.0.1:52273/main/list',
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
    }
})

// 일기 삭제
router.post('/destroy', function (res, req) {
    
    //이미지 삭제
    let r = "SELECT `img_url` FROM `my_db`.`diary` where `diary_pid`=" + res.body.destroy_id;
    
    client.query(r, function (err, row) {
        //지난 이미지 삭제
        if(row[0].img_url != '') {
            fs.unlink("public/"+row[0].img_url,function(err){ if(err) throw err; });
        }
        if (err) {
            throw err;
        }
    });
    
    //DB삭제
    let q = "UPDATE `diary` SET `is_deleted` = true WHERE (`diary_pid` = '" + res.body.destroy_id + "');";
    console.log(res.body);
    client.query(q, function (err, row) {
        if (err) throw err;
    });
    req.redirect("back");
})

// 일기 수정
router.post('/update',upload.single('img_url'), function (res, req) {
    //req,res 역순????
    //이미지 처리 분기문
    let file_q;
    let q;
    let r = "SELECT `img_url` FROM `my_db`.`diary` where `diary_pid`=" + res.body.update_id;
    if(res.file != null) {
        client.query(r, function (err, row) {
            //지난 이미지 삭제
            if(row[0].img_url != ''){
                fs.unlink("public/"+row[0].img_url,function(err){ if(err) throw err; });
            }
            if (err) {
                throw err;
            }
        });
        
        file_q = '/images/uploads/' + res.file.filename;
        //쿼리 
        q = "UPDATE `diary` SET \
        `img_url` = '"+ file_q +"', \
        `text` = '" + base64.encode(utf8.encode(res.body.text)) + "' WHERE (`diary_pid` = '" + res.body.update_id + "');";
    }
    else {
        client.query(r, function (err, row) {
            if(row[0].img_url != '') {
                //사용자 이미지 삭제 체크시
                if(res.body.image_delete_chk == 'on' && row[0].img_url != '') {
                    fs.unlink("public/"+row[0].img_url,function(err){ if(err) throw err; });
                    let qq = "UPDATE `diary` SET `img_url` = '' WHERE (`diary_pid` = '" + res.body.update_id + "');";
                    client.query(qq,function(err,row){if(err){throw err}});
                }
            }
            if(err) throw err;
        });
        //쿼리
        q = "UPDATE `diary` SET \
        `text` = '" + base64.encode(utf8.encode(res.body.text)) + "' WHERE (`diary_pid` = '" + res.body.update_id + "');";
    }
        
    client.query(q, function (err, row) {
        if (err) {
            throw err;
        }
        else req.redirect("back");
    });
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
            res.redirect('../users/login');
        }
        let p = "UPDATE `my_db`.`user` SET `token` = \'" + token + "\' WHERE `user_pid` =" + sess.user_pid;
        client.query(p,function(err,row){
            if(err) {
                console.log("토큰값 추가 실패2 : " + err);
                throw err;
                res.redirect('../users/login');
            }
            console.log("토큰값 추가 성공2 : " + p);
        });
        console.log("토큰값 추가 성공1 : " + q);
    });
    res.json(req.body);
});

// 커플 요청 푸시알람 및 요청 처리
router.post('/coupleMsg', function (req, res, next) {
    //session
    var sess = req.session;
    if(Object.keys(req.body)[0] == sess.user_pid){
        // 1 : 자기 자신과의 커플 요청 에러
        res.json(1);
    } else {
        var coupleUser = null;
        const couplePid = Object.keys(req.body)[0];
        const msgTitle = utf8.decode(base64.decode(sess.nickname)) + '님으로부터의 커플 요청이 도착했습니다.';
        const msg = utf8.decode(base64.decode(sess.nickname)) + '님이 회원님을 커플로 등록하기를 요청했습니다. 수락하시겠습니까?';
        console.log(couplePid + "  " + msgTitle + "  " + msg);
        if(!Number(couplePid)) { 
            console.log("여기 걸리는거야??" + Number(couplePid));
            // 4 : 커플 피드를 문자로 입력할시 발생하는 에러
            res.json(4);
        } else {
            let q = "SELECT `nickname`, `is_coupled`, `token` FROM `my_db`.`user` WHERE `user_pid` =" + couplePid;
            client.query(q, function (err, row) {
                if (err) throw err;
                if (!row[0]) {
                    // 2 : 해당 유저가 존재하지 않는 에러
                    res.json(2);
                } else {
                    console.log('\n상대 닉네임 : ' + row[0].nickname + '  상대 커플 여부 : ' + row[0].is_coupled + '  상대 토큰 : ' + row[0].token);
                    coupleUser = row[0].token;
                    if(row[0].is_coupled != null) {
                        // 3 : 이미 커플중인 상대에게 요청을 보낸 에러
                        res.json(3);
                    } else {
                        console.log('\n나의 pid : ' + sess.user_pid + '   커플 pid : ' + couplePid);
                        let p = "UPDATE `my_db`.`user`\
                        SET `match` ="+ couplePid +", `is_coupled` = 2\
                        WHERE `user_pid` ="+ sess.user_pid +";" + 
                        "UPDATE `my_db`.`user`\
                        SET `match` ="+ sess.user_pid +", `is_coupled` = 0\
                        WHERE `user_pid` = "+ couplePid +";"  
                        client.query(p, function (err, row) {
                            if (err) throw err;
                            if (coupleUser == null) {
                                // 0 : 요청 성공, Token 값이 없는 경우
                                res.json(0);
                            } else {
                                const payload = {
                                    notification: {
                                        title: msgTitle,
                                        body: msg,
                                        sound: 'default',
                                        click_action: 'http://127.0.0.1:52273/users/login',
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
                                // 0 : 요청 성공. 
                                res.json(0);
                            }      
                        });        
                    }
                }
            });
        }
    }
})

// 커플 요청 수락 처리
router.post('/coupleAcpt', function (req, res, next) {
    //session
    var sess = req.session;
    const couplePid = Object.keys(req.body)[0];
    const msgTitle = utf8.decode(base64.decode(sess.nickname)) + '님이 커플요청을 수락하였습니다!';
    const msg = utf8.decode(base64.decode(sess.nickname)) + '님이 회원님의 커플요청을 수락하였습니다. 평행일기를 시작해 보세요!';
    console.log(msgTitle + "  " + msg);
    let q = "SELECT `token` FROM `my_db`.`user` WHERE `user_pid` =" + couplePid;
    client.query(q, function (err, row) {
        if (err) throw err;
        console.log('상대 토큰 : ' + row[0].token);
        coupleUser = row[0].token;
        console.log('\n나의 pid : ' + sess.user_pid + '   커플 pid : ' + couplePid);
        let p = "UPDATE `my_db`.`user`\
        SET `is_coupled` = 1\
        WHERE `user_pid` ="+ sess.user_pid +";" + 
        "UPDATE `my_db`.`user`\
        SET `is_coupled` = 1\
        WHERE `user_pid` = "+ couplePid +";"  
        client.query(p, function (err, row) {
            if (err) throw err;
            if (coupleUser == null) {
                // 수락 성공! Token 값이 없는 경우
                res.json(0);
            } else {
                const payload = {
                    notification: {
                        title: msgTitle,
                        body: msg,
                        sound: 'default',
                        click_action: 'http://127.0.0.1:52273/main/list',
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
                // 수락 성공!
                res.json(0);
            }      
        });        
    });
})

// 커플 요청 거절 처리
router.post('/coupleRej', function (req, res, next) {
    //session
    var sess = req.session;
    const couplePid = Object.keys(req.body)[0];
    const msgTitle = utf8.decode(base64.decode(sess.nickname)) + '님이 커플요청을 거절하였습니다.';
    const msg = utf8.decode(base64.decode(sess.nickname)) + '님이 회원님의 커플요청을 거절하였습니다. 다시 시작해 보세요.';
    console.log(msgTitle + "  " + msg);
    console.log("CouplePid : " + couplePid);
    let q = "SELECT `token` FROM `my_db`.`user` WHERE `user_pid` =" + couplePid;
    client.query(q, function (err, row) {
        if (err) throw err;
        console.log('상대 토큰 : ' + row[0].token);
        coupleUser = row[0].token;
        console.log('\n나의 pid : ' + sess.user_pid + '   커플 pid : ' + couplePid);
        let p = "UPDATE `my_db`.`user`\
        SET `match` = NULL, `is_coupled` = NULL\
        WHERE `user_pid` ="+ sess.user_pid +";" + 
        "UPDATE `my_db`.`user`\
        SET `match` = NULL, `is_coupled` = NULL\
        WHERE `user_pid` = "+ couplePid +";"  
        client.query(p, function (err, row) {
            if (err) throw err;
            if (coupleUser == null) {
                // 거절 성공. Token 값이 없는 경우
                res.json(0);
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
                // 거절 성공. 
                res.json(0);
            }      
        });        
    });
})

// 커플 요청 취소 처리
router.post('/coupleCnl', function (req, res, next) {
    //session
    var sess = req.session;
    console.log("취소상대 pid : " + Object.keys(req.body)[0])
    const couplePid = Object.keys(req.body)[0];
    console.log('\n나의 pid : ' + sess.user_pid + '   커플 pid : ' + couplePid);
    let p = "UPDATE `my_db`.`user`\
    SET `match` = NULL, `is_coupled` = NULL\
    WHERE `user_pid` ="+ sess.user_pid +";" + 
    "UPDATE `my_db`.`user`\
    SET `match` = NULL, `is_coupled` = NULL\
    WHERE `user_pid` = "+ couplePid +";"  
    client.query(p, function (err, row) {
        if (err) throw err;
        res.json(0);      
    });
})

module.exports = router;