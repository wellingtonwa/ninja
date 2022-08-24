const httpsDownload = require('./httpsDownload');
const path = require('path');
const http = require('http');
const fs = require('fs');
const admZip = require('adm-zip');
const saveFile = require('./ioUtils').saveDownloadedFile;

const REGEX_HTTPS = /^https:\/\/.*/g;

let url =  'http://tinyurl.com/yx3yxqnw';
httpDownload = async (link, caminhoArquivo) => {
    return new Promise((resolve, reject) => {

        const request = http.get(link, response => {
            
            var len = parseInt(response.headers['content-length'], 10);
            var body = "";
            var cur = 0;
            var total = len / 1048576; //1048576 - bytes in  1Megabyte

            response.on("data", function(chunk) {
                body += chunk;
                cur += chunk.length;
                console.log("Downloading " + (100.0 * cur / len).toFixed(2) + " percent " + (cur / 1048576).toFixed(2) + " mb" + ". Total size: " + total.toFixed(2) + " mb");
            });

            if (response.statusCode === 200) {
                resolve(saveDownloadedFile(response, caminhoArquivo));
            }
            if (response.statusCode === 301) {
                var novaUrl = response.headers.location;
                // verificando se a nova url é https;
                if (novaUrl.match(REGEX_HTTPS)) {
                    resolve(httpsDownload(novaUrl, caminhoArquivo));
                } else {
                    resolve(httpDownload(link, caminhoArquivo));
                }
            }
            else if (response.statusCode === 302) {
                if (response.headers.location.match(REGEX_HTTPS)) {
                    resolve(httpsDownload(response.headers.location, caminhoArquivo));
                }
                else {
                    resolve(httpDownload(response.headers.location, caminhoArquivo));
                }
            } else {
                reject(response);
            }
        });
    });
};

module.exports = httpDownload;
