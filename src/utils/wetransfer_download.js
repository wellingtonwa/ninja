var express = require('express');
var router = express.Router();
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require("path");
const got = require('got');
const tough = require('tough-cookie');
const Cookie = tough.Cookie;
const fs = require('fs');
const httpsDownload = require('../utils/httpsDownload');

const WETRANSFER_BASE = 'https://wetransfer.com';
const INIT_OF_WETRANSFER_URL = '/downloads/';
const WETRANSFER_API_URL = WETRANSFER_BASE + '/api/v4/transfers';
const WETRANSFER_DOWNLOAD_URL = WETRANSFER_API_URL + '/%s/download';
const canal = 'db restore';

var transferId;
var securityHash;
var csrfToken;
var auxcookie;
var urlDownload;

async function restaurar(link, pathAddress) {
    try {
        await getDownloadUrl(link);
    } catch(ex) {
        console.log(`Status code: ${ex.statusCode} - ${ex.body}. Execução Finalizada.`);
        return;
    }
    try {
        await getRequestParam();
    } catch(ex) {
        console.log(`Status code: ${ex.statusCode} - ${ex.body}. Execução Finalizada.`);
        return;
    }
    var url;
    try {
        url = await getDirectLink(); 
    } catch(ex) {
        console.log(`Status code: ${ex.statusCode} - ${ex.body}. Execução Finalizada.`);
        return;
    }

    const direct_link = JSON.parse(url.body).direct_link;
    const nomeArquivo = getFileName(direct_link);
    console.log(`<br/>Fazendo download do arquivo do ${nomeArquivo} ...`);
    const pathFile = path.join(__dirname, `../../uploads/${nomeArquivo}`);
    try {
        await httpsDownload(direct_link, pathFile);
    } catch (error) {
        console.log(error);
    }
    console.log("<br/>Download concluído...");
    console.log(pathFile);
}

function isNomeBancoValido(nomeBanco){
    if (nomeBanco) {
        var match = nomeBanco.match(/[a-z_0-9]*/i);
        return match && nomeBanco === match[0];
    }
    return false;
}


/*********************************************/
/* MÉTODOS PARA FAZER DOWNLOAD DO WETRANSFER */
/*********************************************/

async function getDownloadUrl(link) {
    const data = await got.get(link, {withCredentials: true});
    if (data.statusCode == 200) {
        var params = data.req.path.replace(INIT_OF_WETRANSFER_URL, '').split('/');
        if (params.length === 2) {
            transferId = params[0];
            securityHash = params[1];
            var dadosJson = {security_hash: securityHash};
            urlDownload = util.format(WETRANSFER_DOWNLOAD_URL, transferId);
        } 
    }
}

async function getRequestParam() {
    const data = await got.get('https://wetransfer.com/');
    var regexCSRF = /name="csrf-token" content="([^"]+)/g;
    csrfToken = regexCSRF.exec(data.body)[1];
    auxcookie = data.headers['set-cookie'];
}

async function getDirectLink() {
    const cookieJar = new tough.CookieJar();
    cookieJar.setCookie(Cookie.parse(auxcookie[0]), 'https://wetransfer.com', (e, c) => {
        cookieJar.setCookie(Cookie.parse(auxcookie[1]), 'https://wetransfer.com', (e, c) => {
            
        });
    });
    const url = await got(
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

    return url;
}

function getFileName(directLink) {
    var splitdl = directLink.split("/");
    return /(.*)(?=\?cf)/ig.exec(splitdl.slice(-1).pop())[1];
}