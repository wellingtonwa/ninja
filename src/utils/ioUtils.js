const path = require("path");
const fs = require("fs");
const REGEX_DOWNLOADED_FILENAME = /(?<=attachment; filename=").*(?=";)/ig;

const listFiles = dirPath => {
  return new Promise((resolve, reject) => {
    fs.readdir(dirPath, function(err, files) {
      //handling error
      if (err) reject(err);
      var arquivos = [];
      files.forEach(function(file) {
        arquivos.push(file);
      });
      resolve(arquivos);
    });
  });
};

const apagarArquivo = arquivo => {
  const dir = path.join(__dirname, `../../uploads/${arquivo}`);
  return new Promise((resolve, reject) => {
    fs.unlink(dir, err => {
      if (err) reject(err);
      resolve(`${arquivo} - arquivo apagado!`);
    });
  });
};

const saveDownloadedFile = (response, dest, hasFileNameOnPath = false) => {
  return new Promise((resolve, reject) => {
    var filePath;
    if (hasFileNameOnPath) {
        filePath = dest;
    } else {
        const contentDisposition = response.headers["content-disposition"];
        const fileName = REGEX_DOWNLOADED_FILENAME.exec(contentDisposition)[0];
        filePath = path.resolve(__dirname, `${dest}/${fileName}`);
    }
    const file = fs.createWriteStream(filePath);
    response.pipe(file);

    file.on("finish", () => {
      resolve({ filePath });
    });

    file.on("error", err => {
      file.close();

      if (err.code === "EXIST") {
        reject("File already exists");
      } else {
        fs.unlink(dest, () => {}); // Delete temp file
        reject(Error(err.message));
      }
    });
  });
};

module.exports = { listFiles, apagarArquivo, saveDownloadedFile };
