const admZip = require("adm-zip");
const fs = require("fs");
const path = require("path");
const download = require("../utils/download");

const REGEX_ZIP_FILE = ".*\.zip$";
const REGEX_ARQUIVOBACK = /.*\.backup$/g;
const REGEX_BACKUP_FILENAME = /(?<=backup\/)([[:alnum:]_-]+\.backup$)/g;

const caminhoUpload = path.resolve(__dirname, '../../uploads');

const restaurar = async (params) => {
    let arquivoBackup;
    if (params.filePath.match(REGEX_ZIP_FILE)) {
        arquivoBackup = await descompactar(params.filePath, caminhoUpload);
    }

    
};

const descompactar = (filePath, outputPath) => {
    return new Promise((resolve, reject) => {
        let zip = new admZip(filePath);
        let zipEntries = zip.getEntries();
        zipEntries.filter(it => it.entryName.match(REGEX_ARQUIVOBACK)).forEach( it => {
            const fileDest = path.resolve(__dirname, `${caminhoUpload}${it.entryName.substr(it.entryName.lastIndexOf("/"))}`);
            fs.writeFile(fileDest, it.getData(), function (err) {
                if(err) reject(err);
            });
            resolve(fileDest);
        });
    });
};

// let url =  'http://tinyurl.com/yx3yxqnw';
// const texto = "backup/calima_8312_1059.backup";
// console.log(texto.substr(texto.lastIndexOf("/")));

try {
    descompactar(path.resolve(__dirname, `${caminhoUpload}/automatico-quarta-22h.zip`), caminhoUpload)
    .then(data => console.log(data));
} catch(e) {
    console.log(e);
}

module.exports = descompactar;