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
  password: 'hong1128.',
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
      sha256(utf8.encode(res.body.op1)), //op[0]
      sha256(utf8.encode(res.body.op2)), //op[1]
      sha256(utf8.encode(res.body.op3)) //op[2]
    ],
    answer: [ //sha256 암호화
      sha256(utf8.encode(res.body.answer1)), //answer[0]
      sha256(utf8.encode(res.body.answer2)), //answer[1]
      sha256(utf8.encode(res.body.answer3)) //answer[2]
    ],
    //match와 is_coupled 의 경우 디폴트가 각각 NULL, '0' 으로 지정됨.
  };

  let q = "INSERT INTO `my_db`.`user`(\
    `nickname`,`password`,`e_mail`,\
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
  console.log(q);
  client.query(q, function (err, row) {
    if (err) req.send("<script>window.onload = function(){\
      alert('잘못된 입력입니다.'); history.back();};\
      </script>");
    else req.send("<script>window.onload = function(){\
      alert('"+res.body.nickname+"님 회원 가입이 성공하였습니다. '); window.location.replace('/users/login');};\
      </script>");
  });

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
    let email = row[0].email;
    let match = row[0].match;
    let is_coupled = row[0].is_coupled;
    let pwInDB = row[0].password;
    let pwInParams = sha256(req.body.password);

    //로그인 체크 영역
    if (pwInDB == pwInParams) {

      // 세션에 로그인 정보 동적 추가.
      req.session.nickname = nickInDB;
      req.session.user_pid = user_pid;
      req.session.email = email;
      req.session.couple_pid = match;

      //main code
      console.log("로그인 성공");
      console.log(req.session);
      if (is_coupled == null) {
        // 연인이 없을 경우
        res.redirect('../users/usersetting');
      } else if (is_coupled == 0) {
        // 요청을 받았을 경우
        res.redirect('../users/usersetting')
      } else if (is_coupled == 2) {
        // 요청을 보냈을 경우
        res.redirect('../users/usersetting')
      } else {
        // 연인이 있는 경우
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
  } else
    res.redirect('./login');

});

// 유저설정
router.get('/usersetting', function (req, res, next) {
  var sess = req.session;
  var nickname = sess.nickname;
  var user_pid = sess.user_pid;
  var user_email = sess.email;
  if (nickname) {
    nickname = utf8.decode(base64.decode(sess.nickname));
    let q = "SELECT * FROM my_db.user WHERE `match` = '" + sess.user_pid + "';";
    client.query(q, function (err, row) {
      if (err) throw err;
      if (row[0] == undefined) {
        // 0 : 연인이 없는 경우. 커플 요청 필요
        console.log("0 : 커플요청 필요");
        res.render('users/usersetting', {
          state: '0',
          mypid: user_pid,
          myNick: nickname,
          email: user_email,
          couplePid: null,
          coupeNick: null,
          diarycount: null,
          title: '계정'
        });
      } else {
        let is_coupled = row[0].is_coupled; // "연인"의 커플상태.
        let couplePid = row[0].user_pid; // 연인 유저번호
        let coupleNick = utf8.decode(base64.decode(row[0].nickname)); // 연인 닉네임
        if (is_coupled == 0) {
          // 1 : 내가 커플요청을 보낸경우. 요청 취소가 가능 (coupleProg)
          console.log("1 : 요청중");
          res.render('users/usersetting', {
            state: '1',
            mypid: user_pid,
            myNick: nickname,
            email: user_email,
            couplePid: couplePid,
            coupeNick: null,
            diarycount: null,
            title: '계정'
          });
        } else if (is_coupled == 2) {
          // 1 : 내가 커플요청을 받았을 경우. 요청 수락이 가능 (coupleAcpt)
          console.log("2 : 요청수락");
          res.render('users/usersetting', {
            state: '2',
            mypid: user_pid,
            myNick: nickname,
            email: user_email,
            couplePid: couplePid,
            coupeNick: coupleNick,
            diarycount: null,
            title: '계정'
          });
        } else {
          // 3 : 이미 커플인 경우. 그냥 계정설정 페이지
          console.log("3 : 커플중");
          let p = "SELECT COUNT(*) diarycount FROM `my_db`.`diary` WHERE `user_pid` = '" + user_pid + "' AND `is_deleted` != 1;"
          client.query(p, function (err, row) {
            if (err) throw err;
            let diarycount = row[0].diarycount;
            res.render('users/usersetting', {
              state: '3',
              mypid: user_pid,
              myNick: nickname,
              email: user_email,
              couplePid: couplePid,
              coupeNick: coupleNick,
              diarycount: diarycount,
              title: '계정'
            });
          });
        }
      }
    });
  } else {
    res.redirect('../users/login');
  }
})

// 이별신청 처리
router.post('/coupleBrk', function (req, res, next) {
  //session
  var sess = req.session;
  var user_pid = sess.user_pid;
  const couplePid = Object.keys(req.body)[0];
  let p = "DELETE FROM `my_db`.`diary` WHERE `user_pid` = '" + user_pid + "' OR '" + couplePid + "';"
  client.query(p, function (err, row) {
    if (err) throw err;
    console.log("일기 삭제 완료");
    let q = "UPDATE `my_db`.`user`\
      SET `match` = NULL, `is_coupled` = NULL\
      WHERE `user_pid` = " + couplePid + ";"
    client.query(q, function (err, row) {
      if (err) throw err;
      console.log("상대 커플상태 초기화");
      let r = "DELETE FROM `my_db`.`user` WHERE `user_pid` = '" + user_pid + "';"
      client.query(r, function (err, row) {
        if (err) throw err;
        console.log("내 계정 삭제완료");
        // 세션 삭제
        sess.destroy(function (err) {
          if (err)
            console.log("session error");
          else
            res.json(0);
        })
      });
    });
  });
})

//비밀번호 재설정 / 찾기
router.get('/pwreset', function (req, res, next) {
  if (!req.session.nickname) { //로그인 조차 못할때
    res.render('users/pwreset', {
      user_pid: null,
      nickname: null
    });
  } else { //로그인이 되어 있을때
    res.render('users/pwreset', {
      user_pid: req.session.user_pid,
      nickname: utf8.decode(base64.decode(req.session.nickname))
    });
  }
});

// 비번 재설정, 확인 구문
router.post('/pwreset_check', function (req, res, next) {
  var nickname = base64.encode(utf8.encode(req.body.nickname));
  var user_pid = req.body.user_pid;
  var e_mail = req.body.e_mail;
  var op1 = sha256(utf8.encode(req.body.op1));
  var op2 = sha256(utf8.encode(req.body.op2));
  var op3 = sha256(utf8.encode(req.body.op3));
  var answer1 = sha256(utf8.encode(req.body.answer1));
  var answer2 = sha256(utf8.encode(req.body.answer2));
  var answer3 = sha256(utf8.encode(req.body.answer3));
  var new_password = sha256(utf8.encode(req.body.new_password));
  var is_login;
  var q;
  if (!user_pid) {
    //로그인 안된 유저일시 쿼리
    is_login = false;
    q = "SELECT `password`,`e_mail`,`op1`,`op2`,`op3`,`answer1`,`answer2`,`answer3` \
        FROM `my_db`.`user` WHERE `nickname`='" + nickname + "' AND `e_mail`='" + e_mail + "';";
    console.log(q);
  } else {
    //로그인이 된 유저일 시 쿼리
    is_login = true;
    q = "SELECT `password`,`e_mail`,`op1`,`op2`,`op3`,`answer1`,`answer2`,`answer3` \
        FROM `my_db`.`user` WHERE `user_pid` = " + user_pid + ";";
    console.log(q);
  }
  client.query(q, function (err, row) {
    console.log(row);
    if (err || (!row)) { //쿼리 내에서 오류 / 쿼리의 결과가 없는 경우
      res.send("<script>window.onload = function(){\
        alert('기본정보를 잘못 입력했습니다.다시한번 입력해주세요.'); history.back();};\
        </script>");
    } else { //정확히 입력한 경우
      if (row[0].op1 != op1 || row[0].op2 != op2 || row[0].op3 != op3 || row[0].answer1 != answer1 || row[0].answer2 != answer2 || row[0].answer3 != answer3) {
        res.send("<script>window.onload = function(){\
          alert('질문 정보를 잘못 입력하셨습니다. 다시 입력해주세요.'); history.back();};\
          </script>");
      }
      else { //모든 부분이 정확히 입력된 경우
        let r = "UPDATE `my_db`.`user` SET `password` = '"+new_password+"' ";
        if(is_login) { //로그인 된 경우
          r += " WHERE `user_pid` = " + user_pid + ";";
        }
        else { //로그인이 되지 않은 경우
          r += " WHERE `nickname`='" + nickname + "' AND `e_mail`='" + e_mail + "';";
        }
        client.query(r, function (err, row2) {
          if(err) res.send("<script>window.onload = function(){\
            alert('예기치 않은 에러 입니다.'); history.back();};\
            </script>");
          else res.send("<script>\
            window.onload = function(){\
            alert('비밀번호 변경이 완료되었습니다.'); window.location.replace('/users/login');};\
            </script>");
        });
      }
    }
  });

});


module.exports = router;