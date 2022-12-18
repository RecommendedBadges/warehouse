const fs = require('fs');

const Queue = require('bull');

let workQueue = new Queue('work', process.env.REDIS_URL);

async function queueJob({packagesToUpdate, pullRequestNumber}) {
    let job = await workQueue.add(
        'kickoff',
        {
            sortedPackagesToCreate: packagesToUpdate,
            pullRequestNumber: pullRequestNumber,
        }
    );
    process.stdout.write('Queued kickoff job');
    return job.id;
}

module.exports = {
    queueJob
};