const pgtools = require('pgtools');
const { Pool } = require('pg');
const exec = require('child_process').exec;
const { getConfigs: getConfigJson } =  require('../utils/configs');

const getConfigs = async () => {
    const dados = await getConfigJson();;
    return {
        user: dados['DB_USER'],
        password: dados['DB_PASSWORD'],
        port: dados['DB_PORT'],
        host: dados['DB_HOST'],
        database: dados['DB_DATABASE']
    };
};

const getDatabasePrefix = async () => {
    dados = await getConfigJson();
    return dados['DB_PREFIX'];
};

const getIngoredDbs = async () => {
    dados = await getConfigJson()   ;
    return dados.IGNORE_DBS;
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
                reject(Error(err));
            } else {
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
};

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
};

const dumpDataBase = (params) => {
    return new Promise((resolve, reject) => {
        exec(`pg_dump -h localhost -p 5432 -U postgres -F c -b -v -f "${params.filePath}" ${params.nomeBanco}`, (error, stdout, stderr) => {
            if (error) {
              reject(error);
            }
            resolve({stdout, stderr});
          });
    })
};

const dumpDataBaseDocker = (params) => {
    return new Promise((resolve, reject) => {
        console.log(`docker exec -t postgres sh -c "pg_dump -h localhost -p 5432 -U postgres -F c -b -f '/opt/bkp/${params.nomeBanco}.backup' ${params.nomeBanco}"`);
        exec(`docker exec -t postgres sh -c "pg_dump -h localhost -p 5432 -U postgres -F c -b -f '/opt/bkp/${params.nomeBanco}.backup' ${params.nomeBanco}"`, (error, stdout, stderr) => {
            if (error) {
              reject(error);
            }
            resolve({stdout, stderr});
          });
    })
};

module.exports = { dropAll, drop,  getDbnames, getConfigs, createdb, dumpDataBase, createDBDocker, dumpDataBaseDocker };