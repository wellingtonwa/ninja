var express = require('express');
var router = express.Router();
const { Pool } = require('pg');
const { getDbnames } = require('../utils/pgFunctions');
const getDadosArquivoConfig =  require("./configsController").getDadosArquivoConfig;

const canal = 'db restore';

const getConfigs = async () => {
    dados = await getDadosArquivoConfig();
    return {
        user: dados.filter(dd => dd.property === 'DB_USER')[0].value,
        password: dados.filter(dd => dd.property === 'DB_PASSWORD')[0].value,
        port: dados.filter(dd => dd.property === 'DB_PORT')[0].value,
        host: dados.filter(dd => dd.property === 'DB_HOST')[0].value,
        database: dados.filter(dd => dd.property === 'DB_DATABASE')[0].value
    };
};

router.get('/', async function(req, res) {
    var dbNames = await getDbnames();
    res.render('rodarSql/index', {bases: dbNames});
});

router.get('/bancos', async function(req, res) {
    var dbNames = await getDbnames();
    res.send(JSON.stringify(dbNames));
});

router.post('/', async function (req, res) {
    
    var hasErro = false;
    console.log(req.body);

    if(!req.body.nome_banco){
        emitirMensagemSemFmt(req, "----Informe o Banco de dados que os comandos serão executados");
        hasErro = true;
    } 
    if(!req.body.sql){
        emitirMensagemSemFmt(req, "-----Informe os comandos serão executados");
        hasErro = true;
    }

    if(!hasErro) {
        const nomeBanco = req.body.nome_banco;
        const sql = req.body.sql;
        const configs = await getConfigs();
        
        const pool = new Pool({...configs, database:nomeBanco});        
        console.log(configs);
        pool.query(sql, (err, res) => {
            if(res) {
                emitirMensagemSemFmt(req, "SCRIPT EXECUTADO!");
            }else {
                emitirMensagemSemFmt(req, "ERRO AO RODAR O SCRIPT! erro: " + err);
            }
        })
    }
});

function emitirMensagemSemFmt(req, msg) {
    req.app.io.emit(canal, msg);
}

module.exports = router;