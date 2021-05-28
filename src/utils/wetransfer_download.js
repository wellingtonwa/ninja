const util = require('util');
const got = require('got');
const tough = require('tough-cookie');
const Cookie = tough.Cookie;
const fs = require('fs');
const https = require('https');
const path = require("path");

const INIT_OF_WETRANSFER_URL = '/downloads/';

const WETRANSFER_API_URL = 'https://wetransfer.com/api/v4/transfers';
const WETRANSFER_DOWNLOAD_URL = WETRANSFER_API_URL + '/%s/download';
const WETRANSFER_UPLOAD_URL = WETRANSFER_API_URL + '/link';
const WETRANSFER_FINALIZE_URL = WETRANSFER_API_URL + '/%s/finalize';
const WETRANSFER_DEFAULT_CHUNK_SIZE = 5242880;

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

function getRequestParam() {
    return new Promise((resolve, reject) => {
	got.get('https://wetransfer.com/').then(async data => {
            var regexCSRF = /name="csrf-token" content="([^"]+)/g;
            csrfToken = regexCSRF.exec(data.body)[1];
            auxcookie = data.headers['set-cookie'];
            const cookieJar = new tough.CookieJar();
            await setCookie(cookieJar, auxcookie[0]);
            await setCookie(cookieJar, auxcookie[1]);
            resolve({csrfToken, cookie: auxcookie, cookieJar});
        }).catch(e => reject(e));
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
            body:  JSON.stringify({'security_hash': securityHash, 'intent': "entire_transfer"}),
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            cookieJar
        });
}

function getFileName(directLink) {
    var splitdl = directLink.split("/");
    return /(.*)(?=\?token)/ig.exec(splitdl.slice(-1).pop())[1];
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



/***
 * Testando o upload de arquivos
 */
const files = [
    path.resolve(__dirname, "../../uploads/scripts.sql")
];

const message = "Testando o upload";

const setCookie = (cookieJar, value) => {
    return new Promise((resolve, reject) => {
        cookieJar.setCookie(Cookie.parse(value), 'https://wetransfer.com', (e, c) => {
            if (e) reject(e);
            resolve(c);
        });
    });
}

const upload_files = async () => {
    const rd = await getRequestParam();
       
    const dados_arquivo = {
        files: [{'name': "scripts.sql", 'size': fs.statSync(files[0]).size}],
        message,
        ui_language: "en"
    };

    const response = await got(
        WETRANSFER_UPLOAD_URL,
        {
            method: 'post',
            body:  JSON.stringify(dados_arquivo),
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': rd.csrfToken
            },
            cookieJar
        });
    const response_body = JSON.parse(response.body);
    const transfer_id = response_body.id;

    // Agora eu tenho que enviar os arquivos
    const file_to_send = {
        name: path.basename(files[0]),
        size: fs.statSync(files[0]).size,
        stream: fs.createReadStream(files[0]),
        chunk_size: response_body.chunk_size
    }


    // Criando a url encurtada
    const shortner_response = await got(
        util.format(WETRANSFER_FINALIZE_URL, transfer_id),
        {
            method: 'put',
            headers: {
                'X-CSRF-Token': rd.csrfToken
            },
            cookieJar
        });

    console.log(shortner_response);
}


module.exports = { run, getFileName, getRequestParam, setCookie };
