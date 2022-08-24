var express = require('express');
var router = express.Router();
const { Pool } = require('pg');
const { getDbnames } = require('../utils/pgFunctions');
const { getConfigs: getConfigJson } =  require('../utils/configs');

const canal = 'db restore';


const getConfigs = async () => {
    const dados = await getConfigJson();;
    return {
        user: dados['DB_USER'],
        password: dados['DB_PASSWORD'],
        port: dados['DB_PORT'],
        host: dados['DB_HOST'],
        database: dados['DB_DATABASE']
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
        pool.query(sql, (err, res) => {
            if(res) {
                emitirMensagemSemFmt(req, "SCRIPT EXECUTADO!");
            }else {
                emitirMensagemSemFmt(req, "ERRO AO RODAR O SCRIPT! erro: " + err);
            }
        })
    }
    res.send("ok");
});

function emitirMensagemSemFmt(req, msg) {
    req.app.io.emit(canal, msg);
}

module.exports = router;