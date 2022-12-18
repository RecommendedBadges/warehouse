const fs = require('fs');

const Queue = require('bull');

let workQueue = new Queue('work', process.env.REDIS_URL);

const util = require('util');
const exec = util.promisify(require('child_process').exec);

async function queueJob(pullRequestNumber) {
    let {otherStdout, stderr} = await exec('ls');
    if(stderr) {
        console.error(stderr);
    } else {
        console.log(otherStdout);
    }

    const stdout = fs.readFileSync(
        `../${process.env.PACKAGE_UPDATE_FILENAME}`,
        {
            encoding: 'utf-8'
        }
    );
    let job = await workQueue.add(
        'kickoff',
        {
            sortedPackagesToCreate: stdout,
            pullRequestNumber: pullRequestNumber
        }
    );
    process.stdout.write('Queued kickoff job');
    return job.id;
}

module.exports = {
    queueJob
};