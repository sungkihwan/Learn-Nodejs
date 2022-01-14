var router = require('express').Router();

// 공통되는 부분은 따로 때서 관리하는 방법으로 사용
function checkLogin(req, res, next) {
    if (req.user) {
        next()
    } else {
        res.redirect('/login')
    }
}

// 모든 라우터에 적용하는 미들웨어
router.use(checkLogin);

router.get('/shirts', function(요청, 응답) {
    응답.send('셔츠 파는 페이지입니다.');
});

router.get('/pants', function(요청, 응답) {
    응답.send('바지 파는 페이지입니다.');
});

module.exports = router;