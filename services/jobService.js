const fs = require('fs');

const Queue = require('bull');

let workQueue = new Queue('work', process.env.REDIS_URL);

async function queueJob() {
    const stdout = fs.readFileSync(
        `../${process.env.PACKAGE_UPDATE_FILENAME}`,
        {
            encoding: 'utf-8'
        }
    );
    let job = await workQueue.add({sortedPackagesToCreate: stdout})
    return job.id;
}

module.exports = queueJob;