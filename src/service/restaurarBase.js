const admZip = require("adm-zip");
const fs = require("fs");
const path = require("path");
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const download = require("../utils/download");
const getConfigs = require("../utils/pgFunctions").getConfigs;
const createdb = require("../utils/pgFunctions").createdb;
const createdbDocker = require("../utils/pgFunctions").createDBDocker;
const dropdb = require("../utils/pgFunctions").drop;
const {getConfigs: getConfigJson} = require('../utils/configs');
const {getFileContent, isWindows, copyFile} = require("../utils/ioUtils");
const {Pool} = require('pg');

const REGEX_ZIP_FILE = ".*\.zip$";
const REGEX_ARQUIVOBACK = /.*\.backup$/g;

const caminhoUpload = path.resolve(__dirname, '../../uploads');
const backup_folder_docker = `c:\\docker\\postgres\\bkp\\database.backup`;

/**
 * Faz tudo o processo de restaurar um banco de dados
 * @param {filePath:string, nomeBanco:string, msg:function} params
 */
const restaurar = async (params) => {

  const configs = await getConfigJson();

  let arquivoBackup;
  try {
    // Verificando se um arquivo compactado
    console.log(params.filePath.match(REGEX_ZIP_FILE));
    if (params.filePath.match(REGEX_ZIP_FILE)) {
      sendMsg(params, `Descompactando o arquivo ${params.filePath} em ${caminhoUpload}`);
      arquivoBackup = await descompactar(params, caminhoUpload);
      arquivoBackup = arquivoBackup.filePath;
    } else {
      arquivoBackup = params.filePath;
    }
  } catch (error) {
    sendMsg(params, `Erro: ${error}`);
    return;
  }

  arquivoBackup = arquivoBackup.replace(/( )/gm, '\\$1');

  sendMsg(params, `Copiando: cp -f ${arquivoBackup} ${configs.DB_BKP_FOLDER}/database.backup`);
  let retorno = isWindows() ? await exec(`copy ${arquivoBackup} ${backup_folder_docker}`)
      : await exec(
          `sleep 1.2 && cp ${arquivoBackup} ${configs.DB_BKP_FOLDER}/database.backup`);
  sendMsg(params, `Terminou a cópia`);

  sendMsg(params, `Retorno da cópia: ${JSON.stringify(retorno, null, 2)}`);

  try {
    // Tentando apagar base de dados
    sendMsg(params, `Tentando apagar o banco de dados ${params.nomeBanco}`);
    await droparDockerDatabase(params);
  } catch (ignore) {
    sendMsg(params, `O banco de dados ${params.nomeBanco} não existe ou está em uso`);
  }

  try {
    // Tentando criar a base de dados
    sendMsg(params, `criando o banco de dados ${params.nomeBanco}`);
    await createdbDocker(params);
  } catch (error) {
    sendMsg(params, `Erro ao criar o banco: ${error}`);
    return;
  }

  try {
    sendMsg(params, `Restaurando o banco de dados ${params.nomeBanco}`);
    await restoreFileDocker({filePath: arquivoBackup, ...{nomeBanco: params.nomeBanco}});
  } catch (error) {
    sendMsg(params, `Houve um erro ao restaurar o banco: ${error}`);
    return;
  }

  sendMsg(params, `Fazendo o download do script obrigatório`);
  let sql;
  try {
    let resultadoDownloadScript = await downloadScriptObrigatorio({filePath: caminhoUpload});
    sql = await getFileContent(resultadoDownloadScript);
  } catch (error) {
    sendMsg(params, `Erro ao baixar o script obrigatório ${error}`);
    return;
  }
  try {
    sendMsg(params, `Rodando o SQL Obrigatório`);
    await rodarSql({...params, ...{sql}});
  } catch (error) {
    sendMsg(params,
        `Erro ao RODAR o script obrigatório, mas provavelmente a base foi criada e restaurada. Mensagem: ${error}`);
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
    zipEntries.filter(it => it.entryName.match(REGEX_ARQUIVOBACK)).forEach(it => {
      var fileDest;
      if (params.fileDest) {
        fileDest = params.fileDest
      } else {
        fileDest = path.resolve(__dirname,
            `${caminhoUpload}${it.entryName.substr(it.entryName.lastIndexOf("/"))}`);
      }
      fs.writeFile(fileDest, it.getData(), function (err) {
        if (err) {
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
  return exec(
      `pg_restore -h ${configs.host} -p ${configs.port} -U ${configs.user} -d ${params.nomeBanco} "${params.filePath}"`,
      {maxBuffer: 1024 * 50000});
}

/**
 * Restaura uma base de dados Docker
 * @param {filePath:string, nomeBanco:string} params
 */
const copiarBackupContainer = async (params) => {
  return exec(`cp -f "${params.filePath}" ${backup_folder_docker}`, {maxBuffer: 1024 * 50000});
}

/**
 * Restaura uma base de dados Docker
 * @param {filePath:string, nomeBanco:string} params
 */
const restoreFileDocker = async (params) => {
  const configs = await getConfigs();
  return exec(
      `docker exec -t postgres sh -c "pg_restore -U ${configs.user} --dbname ${params.nomeBanco} /opt/bkp/database.backup"`,
      {maxBuffer: 1024 * 50000});
  //return exec(`docker exec postgres pg_restore -h ${configs.host} -p ${configs.port} -U ${configs.user} -d  "/opt/bkp/database.backup"`, {maxBuffer: 1024 * 50000});
}

const droparDockerDatabase = (params) => {
  console.log(params);
  return exec(`docker exec -t postgres psql -U postgres -c "DROP DATABASE ${params.nomeBanco}"`);
}

const criarDockerDatabase = (params) => {
  return exec(`docker exec -t postgres psql -U postgres -c "CREATE DATABASE ${params.nomeBanco}"`);
}

/**
 * Faz o download do arquivo de sql obrigatório
 * @param {filePath:string, hasFileNameOnPath?:boolean} params
 */
const downloadScriptObrigatorio = (params) => {
  // Rodando o script obrigatório
  // return download("https://www.dropbox.com/s/euy5my5b9wsstlp/sql-ambiente-dev-calima.sql?dl=1", params.filePath);
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
        if (err) {
          reject(err)
        }
        resolve(res);
      });
    });
  })
}

module.exports = {
  rodarSql,
  downloadScriptObrigatorio,
  restoreFile,
  descompactar,
  restaurar,
  droparDockerDatabase,
  criarDockerDatabase
};