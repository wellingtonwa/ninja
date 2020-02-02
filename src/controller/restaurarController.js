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
    io.emit(canal, msg);
}

const validarDados = (req) => {
    var erros = [];
    if (req.body.informar_nome && req.body['nome-banco'] === "undefined") {
        erros.push("Informe o nome do banco ¬¬");
    }
    if (!req.file) {
        erros.push("Informe o arquivo ¬¬");
    }
    
    return erros;
}

router.post('/', upload.single('arquivo'),  async function(req, res) {
    io = req.app.io;
    dispatchMsg("Requisição Recebida! Aguarde....");
    // validando os dados recebidos
    var erros = validarDados(req);
    if (erros.length > 0) {
        for(erro of erros){
            dispatchMsg(erro);
        }
        return;
    }

    var nomeBanco = req.file.originalname.replace(/\.(backup|zip)/, "");
    if (req.body.informar_nome) {
        nomeBanco = req.body['nome-banco'];
    }
    await restaurar({ filePath: req.file.path, nomeBanco, msg: dispatchMsg});
    res.send('finalizado');
});

module.exports = router;