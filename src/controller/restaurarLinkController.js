var express = require('express');
var router = express.Router();
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require("path");
const got = require('got');
const tough = require('tough-cookie');
const Cookie = tough.Cookie;
const fs = require('fs');
const download = require('../utils/download');
const restaurarService  = require("../service/restaurarBase").restaurar;

const WETRANSFER_BASE = 'https://wetransfer.com';
const WETRANSFER_URL_REGEX = "https://we.tl/.*";
const INIT_OF_WETRANSFER_URL = '/downloads/';
const WETRANSFER_API_URL = WETRANSFER_BASE + '/api/v4/transfers';
const WETRANSFER_DOWNLOAD_URL = WETRANSFER_API_URL + '/%s/download';
const canal = 'db restore';
const caminhoUpload = path.resolve(__dirname, "../../uploads");

const TINYURL_URL_REGEX = "http://tinyurl.com/.*";

var transferId;
var securityHash;
var csrfToken;
var auxcookie;
var urlDownload;
var io;

router.post('/', function(req, res) {
    io = req.app.io;
    emitirMensagemSemFmt(req, "Requisição Recebida!\nAguarde....");    
    const nomeBanco = req.body['nome-banco'];
    if(isNomeBancoValido(nomeBanco) && req.body.link){
        restaurar(req);
    } else {
        emitirMensagemSemFmt(canal, "<br/>Preciso dos campos preenchidos e válidos. ¬¬");    
    }
    res.render('restaurar/form');
});

async function restaurar(req) {
    const link = req.body.link;

    verificarTipoLink(link, req);

};

async function verificarTipoLink(link, req) {
    const nomeBanco = req.body['nome-banco'];
    if (link.match(WETRANSFER_URL_REGEX)) {
        restaurarWetransfer(link, req);
    } else if (link.match(TINYURL_URL_REGEX)) {
        emitirMensagemSemFmt(req, `Fazendo download do arquivo...`);
        var arquivoZip = await download(link, caminhoUpload);
        await restaurarService({filePath: arquivoZip.filePath, nomeBanco, msg: dispatchMsg});
    }
    else {
        emitirMensagemSemFmt(req, "Link não identificado");
    }
}

async function restaurarWetransfer(link, req) {
    const nomeBanco = req.body['nome-banco'];
    try {
        await getDownloadUrl(link);
    } catch(ex) {
        emitirMensagemSemFmt(req, `Status code: ${ex.statusCode} - ${ex.body}. Execução Finalizada.`);
        return;
    }
    try {
        await getRequestParam();
    } catch(ex) {
        emitirMensagemSemFmt(req, `Status code: ${ex.statusCode} - ${ex.body}. Execução Finalizada.`);
        return;
    }
    
    var url;
    try {
        url = await getDirectLink(); 
    } catch(ex) {
        emitirMensagemSemFmt(req, `Status code: ${ex.statusCode} - ${ex.body}. Execução Finalizada.`);
        return;
    }

    const direct_link = JSON.parse(url.body).direct_link;
    const nomeArquivo = getFileName(direct_link);
    emitirMensagemSemFmt(req, `Fazendo download do arquivo do ${nomeArquivo} ...`);
    const pathFile = path.join(__dirname, `../../uploads/${nomeArquivo}`);
    var fileInfo;
    try {
        fileInfo = await download(direct_link, pathFile, true);
    } catch (error) {
        console.log(error);
    }

    restaurarService({...fileInfo, ...{nomeBanco, msg: dispatchMsg}});
    return;
}

function criarBanco(nomeBanco, caminhoArquivo, req) {
    emitirMensagemSemFmt(req, `Tentando criar banco ${nomeBanco} com o arquivo ${caminhoArquivo}`);
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
    download("https://www.dropbox.com/s/4ub6n18no37o356/scripts.sql?dl=1", path.resolve(__dirname, "../../uploads"))
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

function emitirMensagem(req, saida, msg) {
    req.app.io.emit(canal, "<br/>" + saida + "<br/>" + msg);
}

function emitirMensagemSemFmt(req, msg) {
    req.app.io.emit(canal, msg);
}

function dispatchMsg(msg) {
    io.emit(canal, msg);
}

router.get('/', function(req, res) {
    res.render('restaurar-link/form');
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