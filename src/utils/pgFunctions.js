const pgtools = require('pgtools');
const { Pool } = require('pg');
const exec = require('child_process').exec;
const prefix = process.env.DB_PREFIX;
const ignoreDbs = process.env.IGNORE_DBS
const getDadosArquivoConfig =  require("../controller/configsController").getDadosArquivoConfig;

const getConfigs = async () => {
    dados = await getDadosArquivoConfig();
    return {
        user: dados.filter(dd => dd.property === 'DB_USER')[0].value,
        password: dados.filter(dd => dd.property === 'DB_PASSWORD')[0].value,
        port: dados.filter(dd => dd.property === 'DB_PORT')[0].value,
        host: dados.filter(dd => dd.property === 'DB_HOST')[0].value,
        database: dados.filter(dd => dd.property === 'DB_DATABASE')[0].value
    };
};

const getDatabasePrefix = async () => {
    dados = await getDadosArquivoConfig();
    return dados.filter(dd => dd.property === 'DB_PREFIX')[0].value;  
};

const getIngoredDbs = async () => {
    dados = await getDadosArquivoConfig();
    return dados.filter(dd => dd.property === 'IGNORE_DBS')[0].value;  
};

const getConnection = async () => {
    var configs = await getConfigs();
    return new Pool(configs);
};

const dropAll = (msg) => {
    getDbnames().then((dbs) => {
        dbs.map((db) => { drop(db, msg) });
    }, (err) => {
        console.log(err);
        msg.channel.send(`${db.dbname} >>>>DEU RUIM<<<<`)
    });
};

const getDbnames = async () => {
    var pool = await getConnection();
    var prefix = await getDatabasePrefix();
    var ignoreDbs = await getIngoredDbs();
    return new Promise((resolve, reject) => {
        const query = `SELECT datname as dbname FROM pg_database 
                        WHERE datistemplate = false
                            AND datname like '${prefix}'
                            AND datname NOT IN (${ignoreDbs})
                        ORDER BY datname`;
        pool.query(query, (err, resp) => {
            if (err) {
                console.log(`Erro ${err}`);
                reject(Error(err));
            } else {
                console.log(`Funcionou : ${JSON.stringify(resp, null, 2)}`)
                resolve(resp.rows);
            }
        });
    });
};

const drop = async (db) => {
    const config = await getConfigs();
    return new Promise((resolve, reject) => {
        pgtools.dropdb(config, db, function (err, res) {
            if (err) {
                reject(Error(err));
            }
            else {
                resolve(`${db} >>> REMOVIDO`);
            }
        });
    });
    
};

const createdb = async (db) => {
    const configs = await getConfigs();
    return pgtools.createdb(configs, db);
}

const createDBDocker = async (params) => {
    return new Promise((resolve, reject) => {
        console.log(`docker exec -t postgres psql -U postgres -c "CREATE DATABASE ${params.nomeBanco}"`)
        exec(`docker exec -t postgres psql -U postgres -c "CREATE DATABASE ${params.nomeBanco}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            resolve({stdout, stderr});
        });
    })
}

const dumpDataBase = (params) => {
    return new Promise((resolve, reject) => {
        exec(`pg_dump -h localhost -p 5432 -U postgres -F c -b -v -f "${params.filePath}" ${params.nomeBanco}`, (error, stdout, stderr) => {
            if (error) {
              reject(error);
            }
            resolve({stdout, stderr});
          });
    })
}

const dumpDataBaseDocker = (params) => {
    return new Promise((resolve, reject) => {
        exec(`docker exec -t postgres sh -c "pg_dump -h localhost -p 5432 -U postgres -F c -b -v -f "/opt/bkp/${params.nomeBanco}.backup" ${params.nomeBanco}"`, (error, stdout, stderr) => {
            if (error) {
              reject(error);
            }
            resolve({stdout, stderr});
          });
    })
}

module.exports = { dropAll, drop,  getDbnames, getConfigs, createdb, dumpDataBase, createDBDocker, dumpDataBaseDocker };