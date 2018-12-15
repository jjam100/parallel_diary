# 평행일기 β

## 소개
이 저장소는 서울과학기술대학교 컴퓨터공학과 內 *고급웹프로그래밍* 수업 조별과제용 입니다.
평행일기에 대한 소스코드를 모두 업로드하는 공간입니다.

## 개발노트
[위키로 이동하기...](https://github.com/eurobin4321/parallel_diary/wiki)
개발노트는 다음에서 볼 수 있습니다.

## 팀 정보

서울과학기술대학교 컴퓨터공학과 3명으로 구성되어 있으며 인원은 다음과 같습니다.

+ 홍진백
+ 이창재
+ 장종진

## 처음 이용시 유의사항
* 이용하기 전에 초기 설정이 필요합니다.
    * routes/index.js
        * MySQL 연결 설정
    * routes/main.js
        * MySQL 연결 설정
    * routes/user.js
        * MySQL 연결 설정
    * views/main/list.ejs
        * Firebase 설정
    * views/users/usersetting.ejs
        * Firebase 설정
    * public/firebase-messaging-sw.js
        * FCM Sender ID 설정
    * routes/path
        * serviceAccountKey.json 파일 추가 필요

* 개발자분들은 push하시기 전에 위 설정 및 파일을 모두 지우고 push하시기 바랍니다.