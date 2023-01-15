const { callout, github } = require('../util');
const { queueJob } = require('../services');

const CIRCLECI = 'circleci';
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
        let packagesToUpdate = req.body.sortedPackagesToUpdate; //await getLastJobArtifacts(req.body.jobNumber);
        console.log(packagesToUpdate);
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

async function getLastPipelineID() {
    let data = await callout.get({
        site: CIRCLECI,
        endpoint: `${process.env.PROJECT_SLUG}/pipeline`
    });
    return data.items[0].id;
}

async function getLastBuildWorkflowID(pipelineID) {
    let workflowID;
    let data = await callout.get({
        site: CIRCLECI,
        endpoint: `/pipeline/${pipelineID}/workflow`
    });
    for(let workflow of data.items) {
        if(workflow.name === process.env.WORKFLOW_NAME) {
            workflowID = workflow.id;
        }
    }
    return workflowID;
}

async function getLastJobArtifacts(jobNumber) {
    /*let data = await callout.get({
        site: CIRCLECI,
        endpoint: `/workflow/c6ebe1c0-7121-4e26-b8f5-7ef32bd54d59/job`
    });
    let projectSlug = data.items[0].project_slug;
    let lastJobNumber = data.items[0].job_number;
    console.log(projectSlug);
    throw err;*/
    let data = await callout.get({
        site: CIRCLECI,
        endpoint: `/project/${process.env.CIRCLE_PROJECT_SLUG}/${jobNumber}/artifacts`
    });
    for(let item of data.items) {
        if(item.path === process.env.PACKAGE_UPDATE_PATH) {
            return await callout.get({
                site: CIRCLECI, 
                fullUrl: item.url
            });
        }
    }
}

module.exports = {
    createJob
};