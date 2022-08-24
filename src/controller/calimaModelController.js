var express = require('express');
var router = express.Router();
const path = require("path");
const perf = require('execution-time')();
const {getDadosArquivoConfig} = require('../utils/configs.js');
const _ = require('lodash');

var io;

const CALIMA_MODEL_FOLDER_PROPERTY = "CALIMA_MODEL_FOLDER";

router.post('/checkConfig', async function(req, res) {
    io = req.app.io;
    const dados = await getDadosArquivoConfig();
    res.json({ok: !_.isNil(dados) && !_.isNil(dados.find(it => it.property === CALIMA_MODEL_FOLDER_PROPERTY))});
//    res.json({ok: false});
});

router.post('/', function(req, res) {
    io = req.app.io;
});

module.exports = router;
