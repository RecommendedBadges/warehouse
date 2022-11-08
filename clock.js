const Queue = require('bull');

let workQueue = new Queue('work', process.env.REDIS_URL);

workQueue.add('scheduled', {
    repeat: {
        every: 7200000,
        limit: 5
    }
});