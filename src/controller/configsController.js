var express = require('express');
var router = express.Router();
const path = require("path");
const util = require("util");
const fs = require('fs');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const { getFileContent } = require('../utils/ioUtils');
const {getConfigs} = require("../utils/configs");

const REGEX_WITHESPACES = /( |\t)/g;
const REGEX_EMPTYLINES = /^(\r\n|\n)/g;
const CAMINHO_CONFIG_JSON = path.resolve(__dirname, "../../configs/config.json");


router.get('/', async function(req, res) {

    var configs = await getConfigs();

    res.render('configs/index', {configs:configs});
});

router.post('/', async function (req, res) {
    await saveDadosArquivoConfigJson(req.body);
    var configs = await getDadosArquivoConfig();
    console.log("salvando");
    res.send("ok");
});

router.get('/dados', async function(req, res) {

    var configs = await getConfigs();

    res.send(JSON.stringify(configs));
});

router.get('/dados-json', async function(req, res) {
    var configs = await getDadosConfigJson();
    console.log("get confiigs", configs);
    res.send(JSON.parse(configs));
});

async function saveDadosArquivoConfigJson(dados) {
    return await writeFile(CAMINHO_CONFIG_JSON, JSON.stringify(dados));
}

async function getDadosConfigJson() {
    const configs = await getFileContent({filePath: CAMINHO_CONFIG_JSON});
    return configs;
}

module.exports = {router};