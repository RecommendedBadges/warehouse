const { github } = require('../util');
const { queueJob } = require('../services');

const HEADER_PARAMETER_NAME = 'Token';

async function createJob(req, res) {
    if(req.get(HEADER_PARAMETER_NAME) != process.env.GITHUB_SECRET) {
        res.status(403).send({
          body: 'Authorization failed'
        });
        return;
    } 

    let pullRequestDetails = await github.getOpenPullRequestDetails({pullRequestNumber: req.body.pullRequestNumber});
    if(pullRequestDetails.base.repo.svn_url.includes(process.env.REPOSITORY_URL)) {
        let packagesToUpdate = req.body.sortedPackagesToUpdate;
        let jobId = await queueJob({
            packagesToUpdate,
            pullRequestNumber: req.body.pullRequestNumber
        });
        res.status(200).send({
            data: `Authorized. jobID: ${jobId}`
          });
    } else {
        res.status(204).send();
    }
}

async function scaleDownWarehouseWorker(req, res) {
    if(req.get(HEADER_PARAMETER_NAME) != process.env.WAREHOUSE_WORKER_TOKEN) {
        res.status(403).send({
            body: 'Authorization failed'
        });
        return;
    } else {
        res.status(200).send();
        try {
            heroku.scaleDyno(req.body.formationType, 0);
        } catch(err) {
            console.error(err);
        }
    }
}

module.exports = {
    createJob,
    scaleDownWarehouseWorker
};