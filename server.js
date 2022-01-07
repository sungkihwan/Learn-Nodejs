// express 세팅
const express = require('express');
const app = express();
app.use(express.urlencoded({extended: true}));

// ejs 설정
app.set('view engine', 'ejs');

// form 에서 PUT, DELETE 사용 -> 메소드 오버라이드
const methodOverride = require('method-override')
app.use(methodOverride('_method'))

// mongodb 설정
const MongoClient = require('mongodb').MongoClient;
var db;
// DB 레플리케이션 or 샤딩할 경우 여러개 사용해야 할 듯
MongoClient.connect('mongodb+srv://kihwan:tptkddp12!@cluster0.usvux.mongodb.net/myFirstDatabase?retryWrites=true&w=majority', function(err,client){

    if (err) return console.log(err)
    db = client.db('todoapp')

    // DB 연결 확인 후 app 시작
    app.listen(8080, function(){
        console.log('listen 8080')
    });
})

// public 폴더 static 메모리에 로드
app.use('/public', express.static('public'));

// HOME 화면
app.get('/', function(req, res) {
    res.render('index.ejs')
});

// 글 작성화면
app.get('/write', function(req, res) {
    // res.sendFile(__dirname + '/write.html')
    res.render('write.ejs')
});

// 게시물
app.get('/list', function(req, res) {
    db.collection('post').find().toArray(function(err, result) {
        console.log(result)
        res.render('list.ejs', { posts : result });
    });
});

// 글 저장하기
app.post('/add', function(req, res) {
    // let today = new Date();
    // req.body._id = today.toLocaleString()
    db.collection('counter').findOne({name : '게시물'}, function(err, res) {
        if (err) return console.log(err)
        req.body._id = res.totalPost + 1
        db.collection('post').insertOne(req.body, function(err, res){
            if (err) return console.log(err)
            db.collection('counter').updateOne({name : '게시물'},{ $inc : {totalPost : 1}}, function(err, res){
                if (err) return console.log(err)
                res.redirect('/list')
            })
        })
    });
})

// 글 삭제하기
app.delete('/delete/', function(req, res) {
    req.body._id = parseInt(req.body._id);
    db.collection('post').deleteOne( req.body, function(err, response) {
        if (err) return console.log(err);
        res.status(200).send({ message : '삭제 성공' })
    })
})

// 글 상세화면
app.get('/detail/:id', function(req, res) {
    db.collection('post').findOne({_id : parseInt(req.params.id)}, function(err, response) {
        if (err) return console.log(err);
        console.log(response)
        res.render('detail.ejs', { post : response })
    })
})

app.get('/edit/:id', function(req, res) {
    db.collection('post').findOne( {_id : parseInt(req.params.id)}, function(err, response){
        if (err) return console.log(err);
        console.log(response)
        res.render('edit.ejs', { post : response } )
    })
})

app.put('/edit', function(req, res) {
    db.collection('post').updateOne( { _id : parseInt(req.body.id) }, { $set : { title : req.body.title, date : req.body.date } },
         function(err, response) {
            res.redirect('/list')
    })
})