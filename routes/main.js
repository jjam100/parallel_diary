var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var app = express();
var moment = require('moment');
var utf8 = require('utf8');
var base64 = require('base-64');
var sha256 = require('sha256');
app.use(require('body-parser').json());

// 서울 시간 설정
require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");

// MYSQL 연결설정
var client = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'hong1128.',
    port: 3306,
    database: 'my_db'
});
client.connect();

router.get('/', function (req, res, next) {
    res.redirect("main/list");
});

router.get('/list', function (req, res, next) {
    client.query('SELECT * FROM Diary', function (err, row) {
        if (err) throw err;
        var base64 = require('base-64');
        row.forEach(e => {
            e.text = utf8.decode(base64.decode(e.text));
        });
        res.render('main/list', {
            title: "일기",
            row: row
        });
    })
});
router.post('/create', function (res, req) {
    //응답을 받는 것이므로 res.body 를 사용해야 함.
    // 필수값 : user_pid, text, date
    let q = "INSERT INTO `my_db`.`diary` (`date`, `text`, `img_url`, `user_pid`)VALUES(";
    q += moment().format('YYYYMMDD') + ",'";
    q += base64.encode(utf8.encode(res.body.text)) + "','";
    q += res.body.img_url + "',";
    q += "1";
    q += ")";
    console.log(q);
    client.query(q, function (err, row) {
        if (err) throw err;
        else console.log("결과 : " + row);
    });
    req.redirect("back");
})

router.post('/destroy', function (res, req) {
    //응답을 받는 것이므로 res.body 를 사용해야 함.
    let q = "UPDATE `diary` SET `is_deleted` = true WHERE (`diary_pid` = '" + res.body.destroy_id + "');";
    console.log(res.body);
    client.query(q, function (err, row) {
        if (err) throw err;
    });
    req.redirect("back");
})

router.post('/update', function (res,req){
    //응답을 받는 것이므로 res.body 를 사용해야 함.
    let q = "UPDATE `diary` SET `text` = "+ res.body.text +" WHERE (`diary_pid` = '" + res.body.destroy_id + "');";
});

module.exports = router;