var express = require('express');
const fs = require('fs');
var router = express.Router();
var multer = require('multer');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const readFile = util.promisify(fs.readFile);
const path = require("path");
const { Pool } = require('pg');
const pgtools = require('pgtools');
const getDadosArquivoConfig = require('./configsController').getDadosArquivoConfig;
const download = require('../utils/httpsDownload');
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
getConfigs();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // error first callback
        cb(null, path.resolve(__dirname, '../../uploads/'));
    },
    filename: function (req, file, cb) {
        // error first callback
        cb(null, file.originalname);
    }
});

async function restaurar(file, req) {
    var nomeBanco = file.originalname.replace("\.backup", ""); 
    
    const configs = await getConfigs();

    pgtools.dropdb(configs, nomeBanco)
    .then(dados => {
        emitirMensagemSemFmt(req, "<br/>BANCO APAGADO!!!");
        criarBanco(nomeBanco, file.path, req);
    })
    .catch(erro => {
        emitirMensagemSemFmt(req, `<br/>NÃO FOI POSSÍVEL DROPAR A BASE: ${erro}`);
        criarBanco(nomeBanco, file.path, req);
    });
}

async function criarBanco(nomeBanco, caminhoArquivo, req) {
    const configs = await getConfigs();
    pgtools.createdb(configs, nomeBanco)
    .then(dados => {
        emitirMensagemSemFmt(req, "<br/>BANCO CRIADO!!! RESTAURANDO...");
        exec(`pg_restore -h localhost -p 5432 -U postgres -d ${nomeBanco} ${caminhoArquivo}`, {maxBuffer: 1024 * 50000})
        .then(dados => {
            emitirMensagem(req, dados.stdout, "BANCO RESTAURADO...!!!");
            rodarScript(nomeBanco, req);
        })
        .catch(err => emitirMensagem(req, err.stderr, "NÃO FOI POSSÍVEL RESTAURAR O BANCO!"));
    })
    .catch(err => emitirMensagem(req, err.stderr, "NÃO POSSÍVEL CRIAR O BANCO. EXECUÇÃO CANCELADA!!!"));
}

async function rodarScript(nomeBanco, req) {
    // Rodando o script obrigatório
    const caminhoScript = path.resolve(__dirname, "../../uploads/scripts.sql");
    var configs = await getConfigs();
    
    emitirMensagemSemFmt(req, "<br/>Iniciando o download do script obrigatório...");
    download("https://www.dropbox.com/s/4ub6n18no37o356/scripts.sql?dl=1", caminhoScript)
    .then(async dados => {
        emitirMensagemSemFmt(req, "<br/>DOWNLOAD DO SCRIPT OBRIGATÓRIO CONCLUÍDO!");
        emitirMensagemSemFmt(req, "<br/>Iniciando a execução do script");
        const pool = new Pool({...configs, database:nomeBanco});        
        const sql = await readFile(caminhoScript, "utf-8");
        console.log(caminhoScript, sql);
        pool.query(sql, (err, res) => {
            if(res) {
                emitirMensagemSemFmt(req, "<br/>SCRIPT OBRIGATÓRIO EXECUTADO!");
            }else {
                emitirMensagemSemFmt(req, "<br/>ERRO AO RODAR O SCRIPT DA OBRIGATÓRIO! erro: " + err)
            }
        })
    })
    .catch(err => emitirMensagemSemFmt(req, `<br/>ERRO AO BAIXAR O SCRIPT DA OBRIGATÓRIO! Erro: ${err}`));
}

function emitirMensagem(req, saida, msg) {
    req.app.io.emit(canal, "<br/>" + saida + "<br/>" + msg);
}

function emitirMensagemSemFmt(req, msg) {
    req.app.io.emit(canal, msg);
}

// utiliza a storage para configurar a instância do multer
const upload = multer({ storage });

router.get('/', function(req, res) {
    res.render('restaurar/form');
});

router.post('/', upload.single('arquivo'),  function(req, res) {
    req.app.io.emit(canal, "<br/>Requisição Recebida!\nAguarde....");
    if (req.file) {
        restaurar(req.file, req);
    } else {
        req.app.io.emit(canal, "<br/>Informe o arquivo ¬¬");
    }
    res.render('restaurar/form');
});

module.exports = router;