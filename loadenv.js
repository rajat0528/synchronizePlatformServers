const yaml = require('js-yaml');
const fs = require("fs");
require('dotenv').config();

function getEnvironmentVar() {
	let envymlFileContent = fs.readFileSync('./env.yml', 'utf8');
    let fileContent = yaml.safeLoadAll(envymlFileContent);
    if(fileContent[0][process.env.APP_STAGE]){
        return fileContent[0][process.env.APP_STAGE]
    }	
}
module.exports.getEnvVar = getEnvironmentVar;