var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var app = express();
var moment = require('moment');
var utf8 = require('utf8');
var base64 = require('base-64');
var sha256 = require('sha256');
app.use(require('body-parser').json());

// MYSQL 연결설정
var client = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'hong1128.',
  port: 3306,
  database: 'my_db'
});
client.connect();


/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

router.get('/signup', function (req, res, next) {
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


router.get('/login', function (req, res, next) {
  res.render('users/login');
});
router.post('/check', function (req, res) {
  console.log(req.body);
  let q = "SELECT * FROM `my_db`.`user` WHERE nickname = \'" + base64.encode(utf8.encode(req.body.nickname)) + "\'";
  console.log(q);
  client.query(q,function(err,row) {
    console.log(row[0].password +" \n "+sha256(req.body.password));
    if(row[0].password == sha256(req.body.password)) {
      console.log("로그인 성공");
    }
    else console.log("로그인 실패");
    if(err) throw err;
  });
  res.redirect("/");
});

module.exports = router;