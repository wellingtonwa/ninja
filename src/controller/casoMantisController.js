const express = require('express');
const router = express.Router();
const { getDadosCasos } = require("../utils/mantisUtil");

router.post('/', async function(req, res) {
    res.send(await getDadosCasos({issue_number: req.body['issue_number']}));
});

module.exports = router