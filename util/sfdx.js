const util = require('util');
const exec = util.promisify(require('child_process').exec);

const { fatal } = require('./error.js');

async function getRemainingPackageNumber() {
    const {stdout, stderr} = await exec(`sfdx force:limits:api:display -u ${process.env.HUB_ALIAS} --json`);
    if(stderr) {
        fatal('getPackageLimit()', stderr);
    }

    let remainingPackageNumber = JSON.parse(stdout).result.remainingPackageVersions;
    return remainingPackageNumber;
}

module.exports = getRemainingPackageNumber;