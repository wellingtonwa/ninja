var express = require('express');
var router = express.Router();
const path = require("path");
const util = require("util");
const fs = require('fs');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const { getFileContent } = require('../utils/ioUtils');

const REGEX_WITHESPACES = /( |\t)/g;
const REGEX_EMPTYLINES = /^(\r\n|\n)/g;
const CAMINHO_CONFIG = path.resolve(__dirname, "../../.env");
const CAMINHO_CONFIG_JSON = path.resolve(__dirname, "../../configs/config.json");


router.get('/', async function(req, res) {

    var configs = await getDadosArquivoConfig();

    res.render('configs/index', {configs:configs});
});

router.post('/', async function (req, res) {
    await saveDadosArquivoConfigJson(req.body);
    var configs = await getDadosArquivoConfig();
    console.log("salvando");
    res.send("ok");
});

router.get('/dados', async function(req, res) {

    var configs = await getDadosArquivoConfig();

    res.send(JSON.stringify(configs));
});

router.get('/dados-json', async function(req, res) {
    var configs = await getDadosConfigJson();
    console.log("get confiigs", configs);
    res.send(JSON.parse(configs));
});

async function saveDadosArquivoConfig(dados) {
    var stringInformacoes = Object.keys(dados).map(propriedade => `${propriedade}=${dados[propriedade]}`).join("\r\n");
    return await writeFile(CAMINHO_CONFIG, stringInformacoes);
}

async function saveDadosArquivoConfigJson(dados) {
    return await writeFile(CAMINHO_CONFIG_JSON, JSON.stringify(dados));
}

async function getDadosArquivoConfig() {
    var dadosArquivoConfig;
    try {
        dadosArquivoConfig = await readFile(CAMINHO_CONFIG, "utf-8");
    } catch (error) {        
        throw error;
    }
    dadosArquivoConfig =  dadosArquivoConfig.replace(REGEX_WITHESPACES, '').replace(REGEX_EMPTYLINES, '')
    .split(/(\r\n|\r)/g)
    .filter(dado => dado !== '\r\n')
    .filter(dado => dado!== '')
    .map(dado => {
        configs = dado.split("=");
        return {property:configs[0], value:configs[1]};
    });

    return dadosArquivoConfig;
}

async function getDadosConfigJson() {
    const configs = await getFileContent({filePath: CAMINHO_CONFIG_JSON});
    return configs;
}

module.exports = {router, getDadosArquivoConfig};