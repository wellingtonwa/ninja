const Payload = require('../utils/Payload');
const { upload } = require('../utils/wetransfer_upload');
const dumpDataBaseDocker = require('../utils/pgFunctions').dumpDataBaseDocker;

const uploadFile = async (params) => {    
    sendMsg(params, `Preparando o upload do arquivo`);
    const files = [
        new Payload({ filePath: params.filePath })
    ];
    const newUpload = upload('', '', files, `Backup do banco ${params.nomeBanco}. By Ninja!`, 'en')
        .on('progress', progress => sendMsg(params, `${progress.percent*100}% - ${progress.size && progress.size.transferred} de ${progress.size && progress.size.total}`)) 
        .on('end', (end) => sendMsg(params, `Processo Finalizado: ${end.shortened_url}`))
        .on('error', (error) => sendMsg(params, error));
    ;
}

const backupDataBase = async (params) => {
    /**
     * params.nomeBanco = nome do banco de dados que será feito o backup
     * params.filePath = caminho onde o backup será salvo
     * params.hasFileNameOnPath = boleano que diz se o nome do arquivo já está no caminho. Se não estiver o script vai utilizar o nome banco para nomear o arquivo.
     * params.msg = método que será utilizado para informar o usuário o status da execução do procedimento
     */
    
    return new Promise( async (resolve, reject) => {
        // Verificando se os parâmetros foram preenchidos
        if (!params) {
            throw Error(`Nenhum parâmetro informado.`)
        }
        if (!params.nomeBanco) {
            throw Error('Nome do banco não informado.');
        }
        if (!params.filePath) {
            throw Error('O local onde o arquivo será salvo não foi informado.');
        }
        
        // Se o nome do arquivo não foi passado o script montar um arquivo com o nome do banco
        if (!params.hasOwnProperty('hasFileNameOnPath') && !params.hasFileNameOnPath) {
            params.filePath = `${params.filePath}/${params.nomeBanco}.backup`;
        }

        sendMsg(params, "Tudo ok! Vamos iniciar a execução do procedimento!");
    
        try {
            const result_backup = await dumpDataBaseDocker(params);
            sendMsg(params, "BACKUP EM EXECUÇÃO!");
            sendMsg(params, "BACKUP CONCLUÍDO!!!");
            resolve(result_backup);
        } catch (error) {
            sendMsg(params, "ERRO: " + error.message);
            reject(error);
        };
    });
}

const sendMsg = (params, msg) => {
    params.msg && params.msg(msg);
}

module.exports = { uploadFile, backupDataBase };