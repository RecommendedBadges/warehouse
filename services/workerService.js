const util = require('util');
const exec = util.promisify(require('child_process').exec);

let throng = require('throng');
let Queue = require("bull");

const { fatal, getOpenPullRequestDetails, getRemainingPackageNumber } = require('../util');

let workers = process.env.WEB_CONCURRENCY || 1;

function start() {
  // Connect to the named work queue
  let workQueue = new Queue('work', process.env.REDIS_URL);

  workQueue.process(async (job) => {
    await orchestrate(job.data);
  });
}

async function orchestrate(packagesToUpdate) {
  await cloneRepo();
  let packageLimit = await getRemainingPackageNumber();
  let packagesToUpdateArray = packagesToUpdate.split(' ');

  for(let package of packagesToUpdateArray) {
    if(packageLimit > 0) {
      await exec(`sfdx force:package:version:create -p ${package} -x -w ${process.env.WAIT_TIME}`)
    } else {
      break;
    }
  }

}
async function cloneRepo() {
    let stderr;
    let pullRequest = await getOpenPullRequestDetails();

    ({_, stderr} = await exec(
        `git clone https://${process.env.GITHUB_USERNAME}:${process.env.GITHUB_TOKEN}@${process.env.REPOSITORY_URL} -b ${pullRequest.head.ref}`
    ));
    if(stderr) {
        fatal('cloneRepo()', stderr);
    }

    ({_, stderr} = await exec(`cd ${process.env.REPOSITORY_NAME}`));
    if(stderr) {
        fatal('cloneRepo()', stderr);
    }

    ({_, stderr} = await exec(`git config user.email ${process.env.GIT_USER_EMAIL}`));
    if(stderr) {
        fatal('cloneRepo()', stderr);
    }

    ({_, stderr} = await exec(`git config user.name ${process.env.GIT_USER_NAME}`));
    if(stderr) {
        fatal('cloneRepo()', stderr);
    }
}



// Initialize the clustered worker process
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
throng({ workers, start });
