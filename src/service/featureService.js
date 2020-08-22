
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const getConfigs = require("../utils/pgFunctions").getConfigs;
const { createFolderIfNotExists } = require("../utils/ioUtils");

const criarFeature = async (params) => {
    //git flow feature start ${params.numeroCaso}
    const comandos = [`cd ${params.pathProjeto}`,  `git flow feature start teste`].join(' && ');
    console.log(await exec(comandos));
}

(() => {
    criarFeature({pathProjeto:"D:\\sistemas\\calima"})
})()



