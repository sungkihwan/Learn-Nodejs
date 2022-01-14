// app.use() : 미들웨어 사용 (req -> 미들웨어 -> res 요청과 응답 사이에 동작하는 코드)
// npm install dotenv -> 환경변수 사용
require('dotenv').config()

// npm install express (framework)
const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));

// npm install ejs (view)
app.set('view engine', 'ejs');

// npm install passport passport-local express-session (세션 로그인)
const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');

app.use(session({ secret: 'secretKey', resave: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// npm install multer -> 파일전송 라이브러리
let multer = require('multer');
// var storage = multer.memoryStorage();
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/image')
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname)
    },
    fileFilter: function(req, file, callback) {
        var ext = path.extname(file.originalname);
        if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
            return callback(new Error('PNG, JPG만 업로드하세요'))
        }
        callback(null, true)
    },
    limits: {
        fileSize: 1024 * 1024
    }
})

var upload = multer({ storage: storage });

// npm install method-override --save (form 에서 PUT, DELETE 사용)
const methodOverride = require('method-override')
app.use(methodOverride('_method'))

// npm install mongodb
const MongoClient = require('mongodb').MongoClient;
const res = require('express/lib/response');
var db;
// DB 샤딩 및 복제할 경우 어떻게 할 것 인가?
MongoClient.connect(process.env.DB_URL, function(err, client) {

    if (err) return console.log(err)
    db = client.db('todoapp')

    // DB 연결 확인 후 app 시작
    app.listen(process.env.PORT, function() {
        console.log('listen 8080')
    });
})

// 로컬스트레티지 인증방식 (세션인증)
passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
}, function(usernameField, passwordField, done) {
    //console.log(usernameField, passwordField);
    db.collection('login').findOne({ id: usernameField }, function(err, res) {
        if (err) return done(err)

        if (!res) return done(null, false, { message: '그런 아이디 없음' })
        if (passwordField == res.pw) {
            return done(null, res)
        } else {
            return done(null, false, { message: '비번 틀렸는디?' })
        }
    })
}));

// 세션에 넣는 작업
passport.serializeUser(function(user, done) {
    done(null, user.id)
});

// 디비에서 데이터 가져오는 작업
passport.deserializeUser(function(user, done) {
    db.collection('login').findOne({ id: user }, function(err, res) {
        done(null, res)
    })

});

// 로그인 체크함수
function checkLogin(req, res, next) {
    if (req.user) {
        next()
    } else {
        res.redirect('/login')
    }
}

// public 폴더 static 메모리에 로드
app.use('/public', express.static('public'));

// HOME
app.get('/', function(req, res) {
    res.render('index.ejs')
});

// 라우터 가져오기
app.use('/shop', require('./routes/shop.js'));

// 작성화면
app.get('/write', function(req, res) {
    // res.sendFile(__dirname + '/write.html')
    res.render('write.ejs')
});

// 리스트
app.get('/list', function(req, res) {
    db.collection('post').find().toArray(function(err, result) {
        console.log(result)
        res.render('list.ejs', { posts: result });
    });
});

// 저장하기
app.post('/add', function(req, res) {
    // let today = new Date();
    // req.body._id = today.toLocaleString()
    db.collection('counter').findOne({ name: '게시물' }, function(err, res) {
        if (err) return console.log(err)
        req.body._id = res.totalPost + 1
        req.body.userId = req.user._id
        db.collection('post').insertOne(req.body, function(err, res) {
            if (err) return console.log(err)
            db.collection('counter').updateOne({ name: '게시물' }, { $inc: { totalPost: 1 } }, function(err, res) {
                if (err) return console.log(err)
                res.redirect('/list')
            })
        })
    });
})

// 삭제하기
app.delete('/delete/', function(req, res) {
    req.body._id = parseInt(req.body._id);
    req.body.userId = req.user._id;
    db.collection('post').deleteOne(req.body, function(err, response) {
        if (err) return console.log(err);
        res.status(200).send({ message: '삭제 성공' })
    })
})

// 상세화면
app.get('/detail/:id', function(req, res) {
    db.collection('post').findOne({ _id: parseInt(req.params.id) }, function(err, response) {
        if (err) return console.log(err);
        console.log(response)
        res.render('detail.ejs', { post: response })
    })
})

// 수정하기
app.get('/edit/:id', function(req, res) {
    db.collection('post').findOne({ _id: parseInt(req.params.id) }, function(err, response) {
        if (err) return console.log(err);
        console.log(response)
        res.render('edit.ejs', { post: response })
    })
})

app.put('/edit', function(req, res) {
    db.collection('post').updateOne({ _id: parseInt(req.body.id) }, { $set: { title: req.body.title, date: req.body.date } },
        function(err, response) {
            res.redirect('/list')
        })
})

// 로그인 페이지
app.get('/login', function(req, res) {
    res.render('login.ejs')
})

app.post('/login', passport.authenticate('local', {
    failureRedirect: '/fail'
}), function(req, res) {
    res.redirect('/')
})

// 마이페이지
app.get('/mypage', checkLogin, function(req, res) {
    console.log(req.user)
    res.render('mypage.ejs', { user: req.user })
})

// 검색기능 -> 몽고디비 검색엔진 사용
app.get('/search', (req, res) => {
    var searchKeywords = [{
            $search: {
                index: 'titleSearch',
                text: {
                    query: req.query.value,
                    path: ['title', 'date'] // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
                }
            }
        },
        // // 결과를 정렬
        // { $sort: { _id: 1 } },
        // // sql limit과 같음
        // { $limit: 10 },
        // // 0은 안보여주고 1은 보여줌
        // { $project: { title: 1, _id: 0 } }
    ]

    // console.log(req.query.value)
    db.collection('post').aggregate(searchKeywords).toArray((err, result) => {
        console.log(result)
    })
})

// 회원가입
app.post('/register', (req, res) => {
    db.collection('login').insertOne(req.body, (err, result) => {
        res.redirect('/')
    })
})

//이미지 업로드

app.get('/upload', (req, res) => {
    res.render('imageUpload.ejs')
})

// upload.array('profile', 10) -> 여러개 한번에 저장
app.post('/imageUpload', upload.single('profile'), (req, res) => {
    res.render('list.ejs')
})