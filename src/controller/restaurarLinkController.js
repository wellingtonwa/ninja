var express = require('express');
var router = express.Router();
const path = require("path");
const perf = require('execution-time')();
const download = require('../utils/download');
const restaurarService  = require("../service/restaurarBase").restaurar;
const getDirectLink = require("../utils/wetransfer_download").run;
const getWTFileName = require("../utils/wetransfer_download").getFileName;

const WETRANSFER_URL_REGEX = "https://we.tl/.*";
const canal = 'db restore';
const caminhoUpload = path.resolve(__dirname, "../../uploads");

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
    } else {
        perf.start('download');
        emitirMensagemSemFmt(req, `Fazendo download do arquivo... ${link}`);

        try {
            var arquivoZip = await download(link, caminhoUpload);
        } catch (e) {
            console.log(e);
        }
        emitirMensagemSemFmt(req, `> Tempo de download ${perf.stop('download').time} ms`);
        perf.start('restauração');
        await restaurarService({filePath: arquivoZip.filePath, nomeBanco, msg: dispatchMsg});
        emitirMensagemSemFmt(req, `> Tempo de restauração ${perf.stop('restauração').time} ms`);
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