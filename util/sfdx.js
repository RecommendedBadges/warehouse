const util = require('util');
const exec = util.promisify(require('child_process').exec);

const { fatal } = require('./error.js');

async function authorize() {
    //let stderr;
    console.log('in authorize');
    let {stdout, stderr} = await exec(`openssl version`);
    console.log(stdout);
    console.log(stderr);
    ({stderr} = await exec(
        `openssl enc -nosalt -aes-256-cbc -d -in assets/server.key.enc -out assets/server.key -base64 -K ${process.env.DECRYPTION_KEY} -iv ${process.env.DECRYPTION_IV}`
    ));
    console.log('after');
    if(stderr) {
        fatal('authorize()', stderr);
    }
    console.log('key decoded');
    ({stderr} = await exec(
        `sfdx force:auth:jwt:grant -i ${process.env.HUB_CONSUMER_KEY} -f assets/server.key -u $HUB_USERNAME -d -a $HUB_ALIAS`
    ))
    if(stderr) {
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
