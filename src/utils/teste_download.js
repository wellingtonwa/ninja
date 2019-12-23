const download = require('./httpsDownload');
const path = require('path');
const http = require('http');
const fs = require('fs');
const admZip = require('adm-zip');

const REGEX_SERVER = /(http:\/\/[a-z._-]*)/g;
const REGEX_HTTPS = /^https:\/\/.*/g;
const REGEX_ARQUIVOBACK = /.*\.backup$/g;

let caminhoArquivo = path.resolve(__dirname, "../../uploads/arquivo.zip");

let url =  'http://tinyurl.com/yx3yxqnw';
executar = async (link) => {
    const file = fs.createWriteStream(caminhoArquivo);
    console.log(link);
    const request = http.get(link, async response => {
        console.log(response.statusCode);
        
        if (response.statusCode === 200) {
            response.pipe(file);
        }
        if (response.statusCode === 301) {
            var novaUrl = response.headers.location;
            // verificando se a nova url é https;
            if (novaUrl.match(REGEX_HTTPS)) {
                download(novaUrl, caminhoArquivo);
            } else {
                executar(link);
            }
        }
        else if (response.statusCode === 302) {
            if (response.headers.location.match(REGEX_HTTPS)) {
                download(response.headers.location, caminhoArquivo);
            }
            else {
                executar(response.headers.location);
            }
                
        }
    });
};

const descompactar = (filePath, outputPath) => {
    let zip = new admZip(filePath);
    let zipEntries = zip.getEntries();
    zipEntries.filter(it => it.entryName.match(REGEX_ARQUIVOBACK)).forEach( it => {
        fs.writeFile(outputPath, it.getData(), function (err) {
            if(err) throw err;
        });
        return outputPath;
    });
};

console.log(Date.now());

const caminhoArquivoDescompactado = path.resolve(__dirname, `../../uploads/${Date.now()}.backup`);

descompactar(caminhoArquivo, caminhoArquivoDescompactado);

// executar(url);
