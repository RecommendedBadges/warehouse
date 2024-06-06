const { orchestrate, setupScheduledJob } = require('./services');

let throng = require('throng');
let Queue = require("bull");

let workers = process.env.WEB_CONCURRENCY || 1;

function start() {
  // Connect to the named work queue
  let workQueue = new Queue('work', process.env.REDIS_URL);
  
  process.stdout.write('Worker started.\n');

  workQueue.process('kickoff', async (job) => {
    process.stdout.write('Kickoff job received\n');
    await orchestrate(job.data);
  });

  workQueue.process('scheduled', async () => {
    await setupScheduledJob();
  })
}

// Initialize the clustered worker process
throng({ workers, start });
