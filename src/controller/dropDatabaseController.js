
var express = require('express');
var router = express.Router();
const { Pool } = require('pg');
const { getDbnames } = require('../utils/pgFunctions');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

router.post('/apagar', async function(req, res) {
    if (req.body.nome_banco) {
        for (let dbname in req.body.nome_banco) {
            console.log(req.body.nome_banco[dbname]);
            if (req.body.nome_banco[dbname]) {
                await exec(`psql -U postgres -c "DROP DATABASE ${dbname}"`)
                .then(dados => emitirMensagemSemFmt(req, `Sucesso: ${dados.stdout} - ${dbname}`))
                .catch(err => emitirMensagemSemFmt(req, `Erro: ${dados.stdout}`));
            }
        }
    }
    res.send(JSON.stringify({resultato: "ok"}));
});

function emitirMensagemSemFmt(req, msg) {
    req.app.io.emit('db restore', msg);
}

module.exports = router;