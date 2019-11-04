const pgtools = require('pgtools');
const { Pool } = require('pg');
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
    console.log(configs);
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

const drop = (db, msg) => {
    pgtools.dropdb(config, db.dbname, function (err) {
        if (err) {
            console.error(db.dbname, '>>>>ERRO<<<<<', err);
            msg.channel.send(`${db.dbname} UTILIZADO POR OUTRO CLIENTE`);
        }
        else {
            console.log(db.dbname, ' >>>>DELETADO<<<< ');
            msg.channel.send(`${db.dbname} >>>>DELETADO<<<<`);
        }
    });
}

module.exports = { dropAll, drop,  getDbnames };