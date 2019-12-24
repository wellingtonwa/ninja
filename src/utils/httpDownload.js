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
