const fs = require('fs');

const Queue = require('bull');

let workQueue = new Queue('work', process.env.REDIS_URL);

async function queueJob({packagesToUpdate, pullRequestNumber}) {
    process.stdout.write('In queueJob');
    let job = await workQueue.add(
        'kickoff',
        {
            sortedPackagesToUpdate: packagesToUpdate,
            pullRequestNumber: pullRequestNumber,
        }
    );
    process.stdout.write('Queued kickoff job');
    return job.id;
}

module.exports = {
    queueJob
};