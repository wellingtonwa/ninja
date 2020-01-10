const admZip = require("adm-zip");
const fs = require("fs");
const path = require("path");
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const download = require("../utils/download");
const getConfigs = require("../utils/pgFunctions").getConfigs;
const createdb = require("../utils/pgFunctions").createdb;
const dropdb = require("../utils/pgFunctions").drop;
const getFileContent = require("../utils/ioUtils").getFileContent;
const { Pool } = require('pg');

const REGEX_ZIP_FILE = ".*\.zip$";
const REGEX_ARQUIVOBACK = /.*\.backup$/g;
const REGEX_BACKUP_FILENAME = /(?<=backup\/)([[:alnum:]_-]+\.backup$)/g;

const caminhoUpload = path.resolve(__dirname, '../../uploads');

/**
 * Faz tudo o processo de restaurar um banco de dados
 * @param {filePath:string, nomeBanco:string, msg:function} params 
 */
const restaurar = async (params) => {
    
    let arquivoBackup;
    try {        
        // Verificando se um arquivo compactado
        if (params.filePath.match(REGEX_ZIP_FILE)) {
            sendMsg(params, `Descompactando o arquivo ${params.filePath} em ${caminhoUpload}`);
            arquivoBackup = await descompactar(params, caminhoUpload);
            arquivoBackup = arquivoBackup.filePath;
        } else {
            arquivoBackup = params.filePath;
        }
    } catch(error) {
        sendMsg(params, `Erro: ${error}`);
        return;
    }    
    try {
        // Tentando apagar base de dados
        sendMsg(params, `Tentando apagar o banco de dados ${params.nomeBanco}`);
        await dropdb(params.nomeBanco)
    } catch (ignore) {
        sendMsg(params, `O banco de dados ${params.nomeBanco} não existe ou está em uso`);
    }
    
    try{
        // Tentando criar a base de dados
        sendMsg(params, `criando o banco de dados ${params.nomeBanco}`);
        await createdb(params.nomeBanco);
    } catch(error) {
        sendMsg(params, `Erro ao criar o banco: ${error}`);
        return;
    }

    try {
        sendMsg(params, `Restaurando o banco de dados ${params.nomeBanco}`);
        await restoreFile({ filePath: arquivoBackup, ...{nomeBanco: params.nomeBanco} });
    } catch (error) {
        sendMsg(params, `Houve um erro ao restaurar o banco: ${error}`);
        return;
    }

    sendMsg(params, `Fazendo o download do script obrigatório`);
    let sql;
    try{
        let resultadoDownloadScript = await downloadScriptObrigatorio({filePath: caminhoUpload})    ;
        sql = await getFileContent(resultadoDownloadScript);
    } catch(error) {
        sendMsg(params, `Erro ao baixar o script obrigatório ${error}`);
        return;
    }
    try{
        sendMsg(params, `Rodando o SQL Obrigatório`);
        await rodarSql({ ...params, ...{sql}});
    } catch(error) {
        sendMsg(params, `Erro ao RODAR o script obrigatório, mas provavelmente a base foi criada e restaurada. Mensagem: ${error}`);
        return;
    }
    
    sendMsg(params, `Processo de restauração concluído!`);

    
};

const sendMsg = (params, msg) => {
    params.msg && params.msg(msg);
}

/**
 * 
 * @param {filePath:string, fileDest?:string} params 
 */
const descompactar = (params) => {
    return new Promise((resolve, reject) => {
        let zip = new admZip(params.filePath);
        let zipEntries = zip.getEntries();
        zipEntries.filter(it => it.entryName.match(REGEX_ARQUIVOBACK)).forEach( it => {
            var fileDest;
            if (params.fileDest) 
                fileDest = params.fileDest
            else {
                fileDest = path.resolve(__dirname, `${caminhoUpload}${it.entryName.substr(it.entryName.lastIndexOf("/"))}`);
            }
            fs.writeFile(fileDest, it.getData(), function (err) {
                if(err){
                    reject(err);
                } 
            });
            resolve({filePath: fileDest});
        });
        reject(Error("Arquivo não encontrado"))
    });
};

/**
 * Restaura uma base de dados
 * @param {filePath:string, nomeBanco:string} params 
 */
const restoreFile = async (params) => {
    const configs = await getConfigs();
    return exec(`pg_restore -h ${configs.host} -p ${configs.port} -U ${configs.user} -d ${params.nomeBanco} ${params.filePath}`, {maxBuffer: 1024 * 50000});
}

/**
 * Faz o download do arquivo de sql obrigatório
 * @param {filePath:string, hasFileNameOnPath?:boolean} params 
 */
const downloadScriptObrigatorio = (params) => {
    // Rodando o script obrigatório
    return download("https://www.dropbox.com/s/4ub6n18no37o356/scripts.sql?dl=1", params.filePath);
}

/**
 * Roda um script sql em uma determinada base de dados
 * @param {nomeBanco:string, sql:string} params 
 */
const rodarSql = (params) => {
    return new Promise((resolve, reject) => {
        getConfigs().then(configs => {
            const pool = new Pool({...configs, database: params.nomeBanco});        
            pool.query(params.sql, (err, res) => {
                if(err) reject(err)
                resolve(res);
            });        
        });
    })
}

module.exports = { rodarSql, downloadScriptObrigatorio, restoreFile, descompactar, restaurar };