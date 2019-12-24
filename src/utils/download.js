const httpDownload = require('./httpDownload');
const httpsDownload = require('./httpsDownload');

const HTTP_URL_REGEX  = "http://.*";
const HTTPS_URL_REGEX  = "https://.*";

async function download (url, caminho, hasFileNameOnPath = false) {
    return new Promise((resolve, reject) => {
        if(url.match(HTTP_URL_REGEX)) {
            resolve(httpDownload(url, caminho, hasFileNameOnPath));
        } else if (url.match(HTTPS_URL_REGEX)) {
            resolve(httpsDownload(url, caminho, hasFileNameOnPath));
        } else {
            reject(Error("Protocolo não reconhecido"));
        }
    });
};

module.exports = download;


let url =  'http://tinyurl.com/yx3yxqnw';

