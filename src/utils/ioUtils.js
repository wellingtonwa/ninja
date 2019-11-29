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

module.exports = {listFiles};