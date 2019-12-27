var express = require('express');
var router = express.Router();
const path = require("path");
const download = require('../utils/download');
const restaurarService  = require("../service/restaurarBase").restaurar;
const getDirectLink = require("../utils/wetransfer_download").run;
const getWTFileName = require("../utils/wetransfer_download").getFileName;

const WETRANSFER_URL_REGEX = "https://we.tl/.*";
const canal = 'db restore';
const caminhoUpload = path.resolve(__dirname, "../../uploads");

const TINYURL_URL_REGEX = "http://tinyurl.com/.*";

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
    const direct_link = await getDirectLink(link);
    const nomeArquivo = getWTFileName(direct_link.direct_link);
    emitirMensagemSemFmt(req, `Fazendo download do arquivo do ${nomeArquivo} ...`);
    const pathFile = path.join(__dirname, `../../uploads/${nomeArquivo}`);
    var fileInfo;
    try {
        fileInfo = await download(direct_link.direct_link, pathFile, true);
    } catch (error) {
        console.log(error);
    }

    restaurarService({...fileInfo, ...{nomeBanco, msg: dispatchMsg}});
    return;
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

module.exports = router;