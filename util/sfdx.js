const util = require('util');
const exec = util.promisify(require('child_process').exec);

const { fatal } = require('./error.js');
const { sfdx } = require('../config');

async function authorize() {
    try {
    let stderr;

    ({stderr} = await exec(
        `openssl enc -nosalt -aes-256-cbc -d -in ../assets/server.key.enc -out assets/server.key -base64 -K ${process.env.DECRYPTION_KEY} -iv ${process.env.DECRYPTION_IV}`
    ));
    if(stderr) {
        fatal('authorize()', stderr);
    }

    ({stderr} = await exec(
        `${sfdx.AUTH_JWT_GRANT_COMMAND} -i ${process.env.HUB_CONSUMER_KEY} -f assets/server.key -u $HUB_USERNAME -d -a $HUB_ALIAS -p`
    ));
    if(stderr && !stderr.includes(sfdx.CLI_SERVICE_AGREEMENT)) {
        fatal('authorize()', stderr);
    }
} catch(err) {
    console.log(err);
}
}

async function getRemainingPackageNumber() {
    const {stdout, stderr} = await exec(`${sfdx.LIMITS_API_DISPLAY_COMMAND} -u ${process.env.HUB_ALIAS} --json`);
    if(stderr) {
        fatal('getPackageLimit()', stderr);
    }
    
    let remainingPackageNumber;
    for(let limit of JSON.parse(stdout).result) {
        if(limit.name === sfdx.PACKAGE_LIMIT_NAME) {
            remainingPackageNumber = limit.remaining;
        }
    }
    return remainingPackageNumber;
}

module.exports = {
    authorize,
    getRemainingPackageNumber
};
