var express = require('express');
var session = require('express-session');
var mysql = require('mysql');
var utf8 = require('utf8');
var base64 = require('base-64');
var router = express.Router();

// MYSQL(clearDB) 연결설정
var dbConfig = {
};

var client = mysql.createPool(dbConfig);

client.getConnection(function(err, con){
  if(!err){
      console.log("Connected ClearDB");
  }
  // 커넥션을 풀에 반환
  con.release();
});

/* GET home page. */
router.get('/', function (req, res, next) {
  var sess = req.session;
  var nickname = sess.nickname;
  var user_pid = sess.user_pid;
  var user_email = sess.e_mail;
  var is_coupled = null;
  console.log("유저번호 : " + user_pid);

  if (nickname) {
    nickname = utf8.decode(base64.decode(nickname));
    let q = "SELECT `is_coupled` FROM `heroku_7e0ddf49a41647e`.`user` WHERE `user_pid` =" + user_pid;
    client.query(q, function (err, row) {
      if (err) throw err;
      if (row[0].is_coupled == 1) {
        is_coupled = 1;
      } else {
        is_coupled = 0;
      }
      res.render('index', {
        nickname: nickname,
        e_mail: user_email,
        is_coupled: is_coupled,
        title: '평행일기'
      });
    });
  } else {
    is_coupled = 0;
    res.render('index', {
      nickname : nickname,
      e_mail : user_email,
      is_coupled : is_coupled,
      title: '평행일기'
    });
  }
});

module.exports = router;