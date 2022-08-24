
var express = require('express');
var router = express.Router();
const { Pool } = require('pg');
const { getDbnames } = require('../utils/pgFunctions');
const util = require('util');
const {droparDockerDatabase} = require('../service/restaurarBase');
const exec = util.promisify(require('child_process').exec);
const { openFolder, createFolderIfNotExists } = require('../utils/ioUtils');
const { getConfigs } = require('../utils/configs');
const path = require('path');

router.post('/abrir-pasta', async (req, res) =>  {
    const configs = await getConfigs();
    emitirMensagemSemFmt(req, "Abrindo Pasta");
    // Tenta criar o diretório caso ele não exista
    const diretorio = path.resolve( configs.ISSUE_FOLDER_PATH, `caso-${req.body.numero_caso}`);

    createFolderIfNotExists({dirPath: diretorio }).then(result => {
        openFolder({path: diretorio});
        res.status(200).send(result);
    }).catch(reason => res.status(400).send(reason));

});

router.post('/apagar', async function(req, res) {
    if (req.body.nome_banco) {
        for (let dbname in req.body.nome_banco) {
            if (req.body.nome_banco[dbname]) {
                await droparDockerDatabase({nomeBanco: dbname})
                .then(dados => emitirMensagemSemFmt(req, `Sucesso: ${JSON.stringify(dados)}`))
                .catch(err => emitirMensagemSemFmt(req, `Erro: ${err}`));
            }
        }
    }
    res.send(JSON.stringify({resultato: "ok"}));
});

router.post('/abrirPasta', async (req, res) => {
   openFolder({path: path.resolve("d:\\downloads\\lixo", `caso-${req.body.numero_caso}`)});
});

function emitirMensagemSemFmt(req, msg) {
    req.app.io.emit('db restore', msg);
}

module.exports = router;