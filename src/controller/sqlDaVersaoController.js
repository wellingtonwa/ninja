var express = require('express');
var router = express.Router();
const { Pool } = require('pg');
const { getDbnames } = require('../utils/pgFunctions');
const getDadosArquivoConfig =  require("./configsController").getDadosArquivoConfig;
const {authorize, saveToken} = require('../utils/googleApi');

const canal = 'db restore';
let requisicao;

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
getConfigs();

router.get('/', async function(req, res) {
    var dbNames = await getDbnames();
    res.render('rodarSql/index', {bases: dbNames});
});

router.get('/obter-sql-versao', async function(req, res) {
    requisicao = req;
    dados = await getDadosArquivoConfig();
    let documentId = dados.filter(dd => dd.property === 'GOOGLEDOCS_DOCUMENTID')[0].value;
    res.send(JSON.stringify(await authorize(documentId, emitirMensagemSemFmt)));
});

router.post('/codigo-autorizacao', async function(req, res) {
    requisicao = req;
    res.send(JSON.stringify(await saveToken(req.body.authCode, emitirMensagemSemFmt)))
});

router.post('/', async function (req, res) {
    
    var hasErro = false;

    if(!req.body.nome_banco){
        emitirMensagemSemFmt(req, "<br/>----Informe o Banco de dados que os comandos serão executados");
        hasErro = true;
    } 
    if(!req.body.sql){
        emitirMensagemSemFmt(req, "<br/>-----Informe os comandos serão executados");
        hasErro = true;
    }

    if(!hasErro) {
        const nomeBanco = req.body.nome_banco;
        const sql = req.body.sql;
        const configs = await getConfigs();
        
        const pool = new Pool({...configs, database:nomeBanco});        
        pool.query(sql, (err, res) => {
            if(res) {
                emitirMensagemSemFmt(req, "<br/>SCRIPT EXECUTADO!");
            }else {
                emitirMensagemSemFmt(req, "<br/>ERRO AO RODAR O SCRIPT! erro: " + err);
            }
        })
    }

    res.render('rodarSql/index');
});

router.post('/rodar-sql-da-versao', async function(req, res) {
    requisicao = req;
    dados = await getDadosArquivoConfig();
    let documentId = dados.filter(dd => dd.property === 'GOOGLEDOCS_DOCUMENTID')[0].value;    
    let sqlDaVersao = await authorize(documentId, emitirMensagemSemFmt);
    let nomeBanco = req.body.nome_banco;
    const configs = await getConfigs();
    sqlDaVersao = sqlDaVersao.sql.replace(/^(--).*\n/gm, "").replace(/^\n/gm, "").replace(/\n/gm, "##");
    sqlDaVersao = sqlDaVersao.split("##").filter(it => it.length > 0);
    
    const pool = new Pool({...configs, database:nomeBanco});
    for(statement of sqlDaVersao) {
        var resultado = await new Promise((resolve, reject) => {
            pool.query(statement, (err, res) => {
                if (res) {
                    resolve("OK -> " + statement);
                } else {
                    reject("Deu merda no sql '"+statement+"' Veja isso: " + err);
                }
            });
        }).catch(error => {
            resultado = error
        });
        emitirMensagemSemFmt(resultado);
    }
});

function emitirMensagemSemFmt(msg) {
    requisicao.app.io.emit(canal, msg);
}

module.exports = router;