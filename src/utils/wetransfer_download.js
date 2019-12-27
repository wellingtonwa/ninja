const util = require('util');
const got = require('got');
var tough = require('tough-cookie');
var Cookie = tough.Cookie;
var fs = require('fs');
var https = require('https');
const path = require("path");

var INIT_OF_WETRANSFER_URL = '/downloads/';

var WETRANSFER_API_URL = 'https://wetransfer.com/api/v4/transfers';
var WETRANSFER_DOWNLOAD_URL = WETRANSFER_API_URL + '/%s/download';

var transferId;
var securityHash;
var csrfToken;
var auxcookie;
var urlDownload;

function startDownload(directLink){
    var file_name = getFileName(directLink);
    const file = fs.createWriteStream(path.join(__dirname, `../uploads/${file_name}`));
    const request = https.get(directLink, (response) => response.pipe(file));
}


async function getDownloadUrl(link) {
    await got.get(link, {withCredentials: true}).then(data => {
        // Redirect
        if (data.statusCode == 200) {
            var params = data.req.path.replace(INIT_OF_WETRANSFER_URL, '').split('/');
            if (params.length === 2) {
                transferId = params[0];
                securityHash = params[1];
                var dadosJson = {security_hash: securityHash};
                urlDownload = util.format(WETRANSFER_DOWNLOAD_URL, transferId);
            } 
        }
    }).catch(e => {console.log(e)});
}

async function getRequestParam() {
    return got.get('https://wetransfer.com/').then(data => {
        var regexCSRF = /name="csrf-token" content="([^"]+)/g;
        csrfToken = regexCSRF.exec(data.body)[1];
        auxcookie = data.headers['set-cookie'];
    });
}

async function getDirectLink() {

    const cookieJar = new tough.CookieJar();
    cookieJar.setCookie(Cookie.parse(auxcookie[0]), 'https://wetransfer.com', (e, c) => {
        cookieJar.setCookie(Cookie.parse(auxcookie[1]), 'https://wetransfer.com', (e, c) => {
            
        });
    });
    return got(
        urlDownload,
        {
            method: 'post',
            body:  JSON.stringify({'security_hash': securityHash}),
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            cookieJar
        });
}

function getFileName(directLink) {
    var splitdl = directLink.split("/");
    return /(.*)(?=\?cf)/ig.exec(splitdl.slice(-1).pop())[1];
}

function run(link) {
    return new Promise((resolve, reject) => {
        getDownloadUrl(link).then(d => {
            getRequestParam().then(f => {
                getDirectLink().then(dadosWetransfer => {
                    resolve(JSON.parse(dadosWetransfer.body));
                }) 
            });
        }).catch(e => reject(e));
    });
}

module.exports = { run, getFileName };