const util = require('util');
const exec = util.promisify(require('child_process').exec);

const { fatal } = require('./error.js');

const CLI_SERVICE_AGREEMENT = 'You acknowledge and agree that the CLI tool may collect usage information, user environment, and crash reports for the purposes of providing services or functions that are relevant to use of the CLI tool and product improvements.';


async function authorize() {
    let stderr;

    ({stderr} = await exec(
        `openssl enc -nosalt -aes-256-cbc -d -in assets/server.key.enc -out assets/server.key -base64 -K ${process.env.DECRYPTION_KEY} -iv ${process.env.DECRYPTION_IV}`
    ));
    if(stderr) {
        fatal('authorize()', stderr);
    }

    ({stderr} = await exec(
        `sfdx force:auth:jwt:grant -i ${process.env.HUB_CONSUMER_KEY} -f assets/server.key -u $HUB_USERNAME -d -a $HUB_ALIAS -p`
    ));
    if(stderr && !stderr.includes(CLI_SERVICE_AGREEMENT)) {
        fatal('authorize()', stderr);
    }
}

async function getRemainingPackageNumber() {
    const {stdout, stderr} = await exec(`sfdx force:limits:api:display -u ${process.env.HUB_ALIAS} --json`);
    if(stderr) {
        fatal('getPackageLimit()', stderr);
    }

    let remainingPackageNumber = JSON.parse(stdout).result.remainingPackageVersions;
    return remainingPackageNumber;
}

module.exports = {
    authorize,
    getRemainingPackageNumber
};
