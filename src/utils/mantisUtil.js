const puppeteer = require('puppeteer');
const { getDadosArquivoConfig }  = require('./configs');
const LOGIN_PAGE = "/login.php";
const ISSUE_PAGE = "/view.php?id=%%";
const MANTIS_BASEURL_ATTR = 'MANTIS_BASE_URL';
const REGEX_ISSUENUMBER = /(?<=.*)[0-9]{5}$/;

// Para obter a contagem de tempo
// document.querySelectorAll('li[class="flip-clock-active"]')[4].innerText

const getDadosCasos = async (params) => {
    const MTUSER_ATTR = 'MANTIS_USER';
    const MTPWD_ATTR = 'MANTIS_PASSWORD';
    
    const dadosArquivoConfig = await getDadosArquivoConfig();
    
    const mantisUser = dadosArquivoConfig.find(it => it.property == MTUSER_ATTR).value;
    const mantisPwd = dadosArquivoConfig.find(it => it.property == MTPWD_ATTR).value;
    const baseURL = dadosArquivoConfig.find(it => it.property == MANTIS_BASEURL_ATTR).value;
    
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`${baseURL}${LOGIN_PAGE}`,  {awaitUntil: 'networkidle2'});
    
    await page.evaluate((mantisUser, mantisPwd) => {
        // Setando o login 
        document.querySelector('input[name="username"]').value = mantisUser;
        document.querySelector('input[name="password"]').value = mantisPwd;
        
    }, mantisUser, mantisPwd);
    
    await page.click('input[type="submit"]');
    
    ////////////////////////////////
    // ACESSANDO A PÁGINA DO CASO //
    ////////////////////////////////
    var celulas = {};
    if (typeof params.issue_number === "string") {
        celulas = await obterDadosCaso(page, params.issue_number);
    } else if (Array.isArray(params.issue_number)) {
        let issues_promises = params.issue_number.map(item => {
            return obterDadosCaso(browser, item);
        });

        const dados = await Promise.all(issues_promises);
        for (const [idx, item] of dados.entries()) {
            if (item) {
                celulas[item.numeroCaso.match(REGEX_ISSUENUMBER)] = item;
            } 
        }
        
    } else {
        throw new Error("O parâmetro issue_number deve ser String ou Array");
    }
    await browser.close();

    return celulas;
};

const obterDadosCaso = async (browser, issue_number) => {
    const dadosArquivoConfig = await getDadosArquivoConfig();
    const baseURL = dadosArquivoConfig.find(it => it.property == MANTIS_BASEURL_ATTR).value;
    const page = await browser.newPage();
    try {
        await page.goto(`${baseURL}${ISSUE_PAGE.replace('%%', issue_number)}`, {awaitUntil: 'networkidle2'});
    } catch (error) {
        throw new Error(`Não foi possível carregar a página do caso ${issue_number}. Detalhes: ${error}`);
    }
    
    return await page.evaluate(() => {
        let dados = [...document.querySelectorAll('body > table[class="width100"] > tbody > tr > td')];

        const mantisFields = [
            {"field": "codigoCliente", "label": "CodigoCliente"},
            {"field": "descricao", "label": "Descrição"},
            {"field": "resumo", "label": "Resumo"},
            {"field": "estado", "label": "Estado"},
            {"field": "versao", "label": "Previsto para a Versão"},
            {"field": "prioridade", "label": "Prioridade"},
            {"field": "complexidade", "label": "Complexidade"},
            {"field": "informacaoAdicional", "label": "Informações Adicionais"},
        ];

        const fixFields = [
            {"field": "numeroCaso", position: 10},
            {"field": "projeto", position: 11},
            {"field": "categoria", position: 12},
            {"field": "dataEnvio", position: 14},
            {"field": "ultimaAtualizacao", position: 15},
        ]

        var resultado = {};

        fixFields.forEach(item => {
            resultado[item.field] = dados[item.position].innerText ;
        })

        dados.forEach((item, index) => {
            var founded = mantisFields.find(dadosField => dadosField.label === item.innerText); 
            if (founded) {
                resultado[founded.field] = dados[index + 1].innerText ;
            }
        })
        return resultado;
    }).catch(error => {return null;});
}

module.exports = {getDadosCasos}
