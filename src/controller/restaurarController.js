var express = require('express');
var router = express.Router();
var multer = require('multer');
const path = require("path");
const { restaurar } = require('../service/restaurarBase');
const { createFolderIfNotExists } = require('../utils/ioUtils'); 
const canal = 'db restore';
var io;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // error first callback
        const dirPath = path.resolve(__dirname, '../../uploads/');
        createFolderIfNotExists({dirPath});
        cb(null, dirPath);
    },
    filename: function (req, file, cb) {
        // error first callback
        cb(null, file.originalname);
    }
});

// utiliza a storage para configurar a instância do multer
const upload = multer({ storage });

function dispatchMsg(msg) {
    console.log(msg);
    io.emit(canal, msg);
}

router.post('/', upload.single('arquivo'),  async function(req, res) {
    io = req.app.io;
    dispatchMsg("Requisição Recebida! Aguarde....");
    if (req.file) {
        var nomeBanco = req.file.originalname.replace(/\.(backup|zip)/, "");
        await restaurar({ filePath: req.file.path, nomeBanco, msg: dispatchMsg});
    } else {
        dispatchMsg("Informe o arquivo ¬¬");
    }
    res.send('finalizado');
});

module.exports = router;