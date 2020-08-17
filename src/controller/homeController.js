var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
    res.render('home');
});

router.get('/versao', function(req, res) {
    res.json({versao: 1.0})
});


module.exports = router;