const path = require("path");
const fs = require("fs");

const listFiles = dirPath => {
    return new Promise((resolve, reject) => {
        fs.readdir(dirPath, function (err, files) {
            //handling error
            if (err) reject(err);
            var arquivos = [];
            files.forEach(function (file) {
                arquivos.push(file); 
            });
            resolve(arquivos);
        });
    });
};

const apagarArquivo = (arquivo) => {
    const dir = path.join(__dirname, `../../uploads/${arquivo}`);
    return new Promise((resolve, reject) => {
        fs.unlink(dir, err => {
            if (err) reject(err);
            resolve(`${arquivo} - arquivo apagado!`); 
        });
    });
};

module.exports = {listFiles, apagarArquivo};