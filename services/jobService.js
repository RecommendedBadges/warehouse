const Queue = require('bull');

const { heroku } = require('../util');

let workQueue = new Queue('work', process.env.REDIS_URL);

async function queueJob({packagesToUpdate, pullRequestNumber}) {
    await heroku.scaleDyno('worker', 1);

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

workQueue.on('completed', job => {
    process.stdout.write(job);
});

module.exports = {
    queueJob
};