const path = require("path");
const util = require("util");
const readFile = util.promisify(require("fs").readFile);
const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const { getDadosArquivoConfig } = require("./configs");
const { createFolderIfNotExists } = require("./ioUtils");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/documents.readonly"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.resolve(__dirname, "../../configs/files", "token.json");

async function authorize(documentId, out) {
  const credentials = await getCredentials();
  const docId = await getDocumentId();
  let retorno = await authorize2(credentials, printDocTitle, docId, out);
  return retorno;
}

const getCredentials = async () => {
  const data = await getDadosArquivoConfig();
  const credentials = {
    client_secret: data
      .filter(it => it.property == "GOOGLEDOCS_CLIENTSECRET")
      .map(it => it.value)[0],
    client_id: data
      .filter(it => it.property == "GOOGLEDOCS_CLIENTID")
      .map(it => it.value)[0]
  };
  return credentials;
};

const getDocumentId = async () => {
  const data = await getDadosArquivoConfig();
  const docId = data
    .filter(it => it.property == "GOOGLEDOCS_DOCUMENTID")
    .map(it => it.value)[0];
  return docId;
};

const getGoogleOAuth = async () => {
  redirect_uris = ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"];
  const { client_secret, client_id } = await getCredentials();
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
};

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
async function authorize2(credentials, callback, documentId, out) {
  redirect_uris = ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"];
  const { client_secret, client_id } = credentials;
  const oAuth2Client = await getGoogleOAuth();

  // Check if we have previously stored a token.
  let resultado;
  createFolderIfNotExists({ dirPath: path.dirname(TOKEN_PATH), recursive:true});
  resultado = await readFile(TOKEN_PATH)
    .then(async token => {
      oAuth2Client.setCredentials(JSON.parse(token));
      return callback(oAuth2Client, await getDocumentId());
    })
    .catch(async err => {
      console.error(err);
      return await getNewToken(oAuth2Client, callback, out);
    });
  return resultado;
}

const lerTokenCallback = async (err, token) => {
  if (err) {
    return getNewToken(oAuth2Client, callback, out);
  }
  oAuth2Client.setCredentials(JSON.parse(token));
  return callback(oAuth2Client, documentId);
};

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
async function getNewToken(oAuth2Client, callback, out) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES
  });
  let retorno = { state: "authorize", authUrl };
  return retorno;
}

const saveToken = async (code, out) => {
  const oAuth2Client = await getGoogleOAuth();
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES
  });
  var token = await new Promise((resolve, reject) => {
    oAuth2Client.getToken(code, (err, token) => {
      if (err) reject(err);
      resolve(token);
    });
  })
    .then(d => {
      return d;
    })
    .catch(err => {
      out("Error retrieving access token >> " + err);
      return undefined;
    });

  var resultadoSalvarToken;

  if (token) {
    resultadoSalvarToken = await new Promise((resolve, reject) => {
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
        if (err) reject(err);
        out("Token salvo em >> " + TOKEN_PATH);
        resolve(true);
      });
    })
      .then(d => {
        return d;
      })
      .catch(err => {
        out("Erro ao salvar o token >> " + err);
        return undefined;
      });
  }

  console.log({
    mensagem: "dados após salvar o token",
    token,
    resultadoSalvarToken
  });
  var resultadoFinal =
    resultadoSalvarToken && token ? { state: "auth_ok" } : { state: "auth_fail" };

  return resultadoFinal;
};

function getReadParagraphElement(element) {
  const textRun = element.textRun;
  if (!textRun) {
    return "";
  }
  return textRun.content;
}

function getPureText(elements) {
  text = "";
  elements.forEach(element => {
    const propertyNames = Object.getOwnPropertyNames(element);
    if (propertyNames.includes("paragraph")) {
      innerElements = element.paragraph.elements;
      innerElements.forEach(innerElement => {
        text += getReadParagraphElement(innerElement);
      });
    }
  });
  return text;
}

/**
 * Prints the title of a sample doc:
 * https://docs.google.com/document/d/195j9eDD3ccgjQRttHhJPymLJUCOUjs-jmwTrekvdjFE/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth 2.0 client.
 */
async function printDocTitle(auth, documentId) {
  const docs = google.docs({ version: "v1", auth });
  var text = await new Promise((resolve, reject) => {
    docs.documents.get({ documentId: documentId }, (err, res) => {
      if (err) reject(err);
      resolve(res.data.body.content);
    });
  })
    .then(text => {
      return { state: "success", sql: getPureText(text) };
    })
    .catch(err => {
      return { state: "fail" };
    });
  return text;
}

module.exports = { authorize, saveToken };
