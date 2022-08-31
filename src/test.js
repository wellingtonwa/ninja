const { downloadScriptObrigatorio } = require("./service/restaurarBase");

const URL = "https://www.dropbox.com/s/4ub6n18no37o356/scripts.sql?dl=1";

const REGEX_HAS_URL_START = ""

// console.log(URL.match("http.*"))

downloadScriptObrigatorio("./");