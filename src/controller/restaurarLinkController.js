var express = require('express');
var router = express.Router();
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require("path");
const got = require('got');
const tough = require('tough-cookie');
const Cookie = tough.Cookie;
const fs = require('fs');
const httpsDownload = require('../utils/httpsDownload');

const WETRANSFER_BASE = 'https://wetransfer.com';
const INIT_OF_WETRANSFER_URL = '/downloads/';
const WETRANSFER_API_URL = WETRANSFER_BASE + '/api/v4/transfers';
const WETRANSFER_DOWNLOAD_URL = WETRANSFER_API_URL + '/%s/download';
const canal = 'db restore';

var transferId;
var securityHash;
var csrfToken;
var auxcookie;
var urlDownload;


async function restaurar(file, req) {
    const nomeBanco = req.body['nome-banco'];
    const link = req.body.link;

    await getDownloadUrl(link);

    await getRequestParam();
    var url = await getDirectLink(); 

    const direct_link = JSON.parse(url.body).direct_link;
    const nomeArquivo = getFileName(direct_link);
    emitirMensagemSemFmt(req, `<br/>Fazendo download do arquivo do ${nomeArquivo} ...`);
    const pathFile = path.join(__dirname, `../../uploads/${nomeArquivo}`);
    try {
        await httpsDownload(direct_link, pathFile);
        
    } catch (error) {
        console.log(error);
    }
    emitirMensagemSemFmt(req, "<br/>Download concluído...");
    emitirMensagemSemFmt(req, "<br/>Tentando apagar o banco...");
    console.log(pathFile);
    exec(`psql -U postgres -c "DROP DATABASE ${nomeBanco}"`, {maxBuffer: 1024 * 50000} )
    .then(dados => {
        emitirMensagem(req, dados.stdout, "BANCO APAGADO!!!");
        criarBanco(nomeBanco, pathFile, req);
    })
    .catch(erro => {
        emitirMensagem(req, erro.stderr, "NÃO FOI POSSÍVEL DROPAR A BASE");
        criarBanco(nomeBanco, pathFile, req);
    });

}

function criarBanco(nomeBanco, caminhoArquivo, req) {
    exec(`psql -U postgres -c "CREATE DATABASE ${nomeBanco}"`, {maxBuffer: 1024 * 50000})
    .then(dados => {
        emitirMensagem(req, dados.stdout, "BANCO CRIADO!!! RESTAURANDO...");
        exec(`pg_restore -h localhost -p 5432 -U postgres -d ${nomeBanco} ${caminhoArquivo}`, {maxBuffer: 1024 * 50000})
        .then(dados => {
            emitirMensagem(req, dados.stdout, "BANCO RESTAURADO...!!!");
            rodarScript(nomeBanco, req);
        })
        .catch(err => emitirMensagem(req, err.stderr, "NÃO FOI POSSÍVEL RESTAURAR O BANCO!"));
    })
    .catch(err => emitirMensagem(req, err.stderr, "NÃO POSSÍVEL CRIAR O BANCO. EXECUÇÃO CANCELADA!!!"));
}

function rodarScript(nomeBanco, req) {
    // Rodando o script obrigatório
    exec('powershell -Command "Invoke-WebRequest https://www.dropbox.com/s/4ub6n18no37o356/scripts.sql?dl=1 -OutFile uploads/scripts.sql"')
    .then(dados => {
        emitirMensagem(req, dados.stdout, "DOWNLOAD DO SCRIPT OBRIGATÓRIO CONCLUÍDO!");
        exec(`psql -h localhost -p 5432 -d ${nomeBanco} -U postgres -f uploads/scripts.sql`)
        .then(dados => 
            emitirMensagem(req, dados.stdout, "SCRIPT OBRIGATÓRIO EXECUTADO!")
        )
        .catch(err => 
            emitirMensagem(req, err.stderr, "ERRO AO RODAR O SCRIPT DA OBRIGATÓRIO!")
        );
    })
    .catch(err => emitirMensagem(req, err.stderr, "ERRO AO BAIXAR O SCRIPT DA OBRIGATÓRIO!"));
}

function baixarBanco(nomeBanco, link, req) {
    var path = "uploads";
    download(link, link)
    .onProgress(progress => {
        emitirMensagem(req, " " + progress.percent);
    })
    .then(dados => {
        emitirMensagem(req, dados.stdout, "DOWNLOAD DO BANCO CONCLUÍDO!");
        criarBanco(nomeBanco, path, req);
    })
    .catch(err => emitirMensagem(req, err, "ERRO AO BAIXAR O BANCO"));
}

function emitirMensagem(req, saida, msg) {
    req.app.io.emit(canal, "<br/>" + saida + "<br/>" + msg);
}

function emitirMensagemSemFmt(req, msg) {
    req.app.io.emit(canal, msg);
}

router.get('/', function(req, res) {
    res.render('restaurar-link/form');
});

router.post('/', function(req, res) {
    emitirMensagemSemFmt(req, "<br/>Requisição Recebida!\nAguarde....");    
    const nomeBanco = req.body['nome-banco'];
    if(isNomeBancoValido(nomeBanco) && req.body.link){
        restaurar(req.file, req);
    } else {
        emitirMensagemSemFmt(canal, "<br/>Preciso dos campos preenchidos e válidos. ¬¬");    
    }
    res.render('restaurar/form');
});

function isNomeBancoValido(nomeBanco){
    if (nomeBanco) {
        var match = nomeBanco.match(/[a-z_0-9]*/i);
        return match && nomeBanco === match[0];
    }
    return false;
}


/*********************************************/
/* MÉTODOS PARA FAZER DOWNLOAD DO WETRANSFER */
/*********************************************/

async function startDownload(directLink){
    var file_name = getFileName(directLink);
    const file = fs.createWriteStream(path.join(__dirname, `../../uploads/${file_name}`));
    const getFile = util.promisify(https.get);
    try {
        await getFile(directLink);
    } catch (error) {
        if(error.statusCode === 200) {
            const pipe =util.promisify(error.pipe);
            return pipe(file);
        }
    }
}


async function getDownloadUrl(link) {
    const data = await got.get(link, {withCredentials: true});
    if (data.statusCode == 200) {
        var params = data.req.path.replace(INIT_OF_WETRANSFER_URL, '').split('/');
        if (params.length === 2) {
            transferId = params[0];
            securityHash = params[1];
            var dadosJson = {security_hash: securityHash};
            urlDownload = util.format(WETRANSFER_DOWNLOAD_URL, transferId);
        } 
    }
}

async function getRequestParam() {
    const data = await got.get('https://wetransfer.com/');
    var regexCSRF = /name="csrf-token" content="([^"]+)/g;
    csrfToken = regexCSRF.exec(data.body)[1];
    auxcookie = data.headers['set-cookie'];
}

async function getDirectLink() {
    const cookieJar = new tough.CookieJar();
    cookieJar.setCookie(Cookie.parse(auxcookie[0]), 'https://wetransfer.com', (e, c) => {
        cookieJar.setCookie(Cookie.parse(auxcookie[1]), 'https://wetransfer.com', (e, c) => {
            
        });
    });
    const url = await got(
        urlDownload,
        {
            method: 'post',
            body:  JSON.stringify({'security_hash': securityHash}),
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            cookieJar
        });

    return url;
}

function getFileName(directLink) {
    var splitdl = directLink.split("/");
    return /(.*)(?=\?cf)/ig.exec(splitdl.slice(-1).pop())[1];
}


module.exports = router;