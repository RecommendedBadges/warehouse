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
    
    process.stdout.write('before pull request details');
    let pullRequestDetails = await github.getOpenPullRequestDetails({pullRequestNumber: req.body.pullRequestNumber});
    process.stdout.write('after pull request details');
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
        res.status(204).send({
            data: 'Authorized.'
        });
    }
}

module.exports = {
    createJob
};