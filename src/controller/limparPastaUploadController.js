var express = require('express');
const fs = require('fs');
var router = express.Router();
const path = require('path');
const getDadosArquivoConfig = require('./configsController').getDadosArquivoConfig;
const { listFiles, apagarArquivo } = require('../utils/ioUtils');

let requisicao;
const canal = 'db restore';
const dirPath = path.join(__dirname, '../../uploads');

router.get('/', async function(req, res) {
    const arquivos = await listFiles(dirPath);
    res.send({state: arquivos && arquivos.length > 0 ? 'dirty' : 'clean', arquivos});
});

router.post('/',  function(req, res) {
    requisicao = req;
    req.app.io.emit(canal, "Requisição Recebida!\nAguarde....");
    const arquivos = listFiles(dirPath).then(arquivos => 
        arquivos.map(arquivo => apagarArquivo(arquivo)
            .then(retorno => out(retorno))
            .catch(err => {req.app.io.emit(canal, `Deu ruim! Veja: ${err}`);
        }))
    );  
});

const out = mensagem => {
    requisicao.app.io.emit(canal, mensagem); 
};

module.exports = router;