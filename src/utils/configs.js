const path = require("path");
const util = require("util");
const fs = require('fs');
const readFile = util.promisify(fs.readFile);

const REGEX_WITHESPACES = /( |\t)/g;
const REGEX_EMPTYLINES = /^(\r\n|\n)/g;
const CAMINHO_CONFIG = path.resolve(__dirname, "../../.env");
const CAMINHO_CONFIG_JSON = path.resolve(__dirname, "../../configs/config.json");

async function getDadosArquivoConfig() {
    
    var dadosArquivoConfig;
    try {
        dadosArquivoConfig = fs.readFileSync(CAMINHO_CONFIG, "utf-8");
    } catch (error) {
        res.send(error);
        return;
    }
    dadosArquivoConfig =  dadosArquivoConfig.replace(REGEX_WITHESPACES, '').replace(REGEX_EMPTYLINES, '')
    .split(/(\r\n|\r)/g)
    .filter(dado => dado !== '\r\n')
    .filter(dado => dado!== '')
    .map(dado => {
        configs = dado.split(/=(.+)/);
        return {property:configs[0], value: configs[1]};
    });
    return dadosArquivoConfig;
}

async function getConfigs() {
    let dadosArquivoConfig = String(fs.readFileSync(CAMINHO_CONFIG_JSON));
    let result = null;
    try {
        result = await JSON.parse(dadosArquivoConfig)
    } catch (error) {
        console.log(error);
    }
    return result;
}

module.exports = {getDadosArquivoConfig, getConfigs};