
var express = require('express');
var router = express.Router();
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { uploadFile, backupDataBase } = require('../service/uploadBase');

const caminho_upload = path.resolve(__dirname, '../../uploads');
const canal = 'db restore';
var io;

router.post('/', async function(req, res) {
    io = req.app.io;
    if (req.body.nome_banco) {
        var params = {nomeBanco: req.body.nome_banco, filePath: caminho_upload, msg: dispatchMsg}
        try {
            backupDataBase(params).then(dadosBackup => {
                uploadFile(params);
            });
        } catch (e) {
            dispatchMsg(`Erro: ${e}`);
        }
    }
    res.send(JSON.stringify({resultato: "ok"}));
});

function dispatchMsg(msg) {
    io.emit(canal, msg);
}

module.exports = router;