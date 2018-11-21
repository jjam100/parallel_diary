var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var app = express();
var moment = require('moment');
var utf8 = require('utf8');
var base64 = require('base-64');
var sha256 = require('sha256');
var session = require('express-session');
app.use(require('body-parser').json());

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

/* GET users listing. */
router.get('/', function (req, res, next) {
  console.log(req.session);
});

// 회원가입
router.get('/signup', function (req, res, next) {
  console.log(req.session);
  res.render('users/signup');
});

router.post('/register', function (res, req) {
  //응답을 받는 것이므로 res.body 를 사용해야 함.
  // 필수값 : user_pid, text, date
  //정보 파싱
  let info = {
    //한글의 경우 utf.encode() 로 유니코드로 변환
    nickname: base64.encode(utf8.encode(res.body.nickname)),
    password: sha256(res.body.password),
    e_mail: res.body.e_mail,
    op: [ //base64 암호화
      base64.encode(utf8.encode(res.body.op1)), //op[0]
      base64.encode(utf8.encode(res.body.op2)), //op[1]
      base64.encode(utf8.encode(res.body.op3)) //op[2]
    ],
    answer: [ //sha256 암호화
      sha256(utf8.encode(res.body.answer1)), //answer[0]
      sha256(utf8.encode(res.body.answer2)), //answer[1]
      sha256(utf8.encode(res.body.answer3)) //answer[2]
    ],
    //match와 is_coupled 의 경우 디폴트가 각각 NULL, '0' 으로 지정됨.
  };

  let q = "INSERT INTO `my_db`.`user`(\
    `nickname`,`password`,`e-mail`,\
    `op1`,`op2`,`op3`,\
    `answer1`,`answer2`,`answer3`\
    )VALUES(\
  ";
    
  q += "\'" + info.nickname + "\',";
  q += "\'" + info.password + "\',";
  q += "\'" + info.e_mail + "\',";
  q += "\'" + info.op[0] + "\',";
  q += "\'" + info.op[1] + "\',";
  q += "\'" + info.op[2] + "\',";
  q += "\'" + info.answer[0] + "\',";
  q += "\'" + info.answer[1] + "\',";
  q += "\'" + info.answer[2] + "\')";

  client.query(q, function (err, row) {
    if (err) res.send("alert('잘못된 입력입니다.')");
  });
  req.redirect('/');
})

// 로그인
router.get('/login', function (req, res, next) {
  //render
  res.render('users/login');
});
router.post('/check', function (req, res, next) {
  let q = "SELECT * FROM `my_db`.`user` WHERE nickname = \'" + base64.encode(utf8.encode(req.body.nickname)) + "\'";
  client.query(q, function (err, row) {
    //로그인 변수 설정
    let user_pid = row[0].user_pid;
    let nickInDB = row[0].nickname;
    let match = row[0].match;
    let is_coupled = row[0].is_coupled;
    let pwInDB = row[0].password;
    let pwInParams = sha256(req.body.password);

    //로그인 체크 영역
    if (pwInDB == pwInParams) {

      // 세션에 로그인 정보 동적 추가.
      req.session.nickname = nickInDB;
      req.session.user_pid = user_pid;
      req.session.couple_pid = match;

      //main code
      console.log("로그인 성공");
      console.log(req.session);
      if (is_coupled == null) {
        res.redirect('../main/coupleReq');
      } else if (is_coupled == 0) {
        res.redirect('../main/coupleAcpt')
      } else if (is_coupled == 2) {
        res.redirect('../main/coupleProg')
      } else {
        res.redirect('../main/list');
      }
    } else {
      console.log("로그인 실패");
      res.redirect('./login');
    }
  });
});

router.get('/logout', function (req, res) {
  if (req.session.nickname) {
    req.session.destroy(function (err) {
      if (err)
        console.log("session error");
      else
        res.redirect('./login');
    })
  } 
  else
    res.redirect('./login');

});

// 유저설정
router.get('/usersetting', function (req, res, next) {
  var sess = req.session;
  var nickname = sess.nickname;
  var user_pid = sess.user_pid;
  var match = null;
  // if (nickname) {
  //     let q = "SELECT `match`, `is_coupled` FROM `my_db`.`user` WHERE `user_pid` =" + user_pid;
  //     client.query(q, function (err, row) {
  //         if (err) throw err;
  //         if (row[0].is_coupled != 2) {
  //             res.redirect('/');
  //         } else {
  //             match = row[0].match;
  //             res.render('main/coupleProg', {
  //                 title: '요청중',
  //                 match: match,
  //                 error : 0
  //             });
  //         }
  //     });
  // } else {
  //     res.redirect('../users/login');
  // }
  res.render('users/usersetting', {
    title: '설정'
  });
})


module.exports = router;