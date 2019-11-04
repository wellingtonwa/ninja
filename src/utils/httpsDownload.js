const https = require("https");
const fs = require("fs");

const REGEX_SERVER = /(https:\/\/[a-z._-]*)/g;

async function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);

        const request = https.get(url, async response => {
            if (response.statusCode === 200) {
                response.pipe(file);
            }
            else if (response.statusCode === 301) {
                const dados_url = await REGEX_SERVER.exec(url);
                const base_url = dados_url[1];
                var novaUrl = base_url + response.headers.location;
                resolve(download(novaUrl, dest));
            }
            else if (response.statusCode === 302) {
                resolve(download(response.headers.location, dest));
            }
            else {
                console.log(response);
                file.close();
                fs.unlink(dest, () => {}); // Delete temp file
                reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`);
            }
        });

        request.on("error", err => {
            file.close();
            fs.unlink(dest, () => {}); // Delete temp file
            reject(err);
        });

        file.on("finish", () => {
            resolve();
        });

        file.on("error", err => {
            file.close();

            if (err.code === "EXIST") {
                reject("File already exists");
            } else {
                fs.unlink(dest, () => {}); // Delete temp file
                reject(err.message);
            }
        });
    });
}

module.exports = download;