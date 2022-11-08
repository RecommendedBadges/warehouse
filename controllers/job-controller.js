const crypto = require('crypto');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const { fatal, callout } = require('../util');
const { queueJob } = require('../services');

const CIRCLECI = 'circleci';

async function createJob(req, res) {
    if(!validateRequest(req)) {
        res.status(403).send({
          body: 'Authorization failed'
        });
    } else if(req.body.pull_request.merged && req.body.repository.html_url == REPOSITORY_URL) {
        let lastPipelineID = await getLastPipelineID();
        let lastBuildWorkflowID = await getLastBuildWorkflowID(lastPipelineID);
        await getLastJobArtifacts(lastBuildWorkflowID);

        let jobId = await queueJob();
        res.status(200).send({
            body: `Authorized. jobID: ${jobId}`
          });
    } else {
        res.status(204).send({
            body: 'Authorized. Job not queued because pull request is not merged.'
        });
    }
}

function validateRequest(req) {
    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', process.env.GITHUB_SECRET).update(JSON.stringify(req.body)).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(req.get('x-hub-signature-256')));
}

async function getLastPipelineID() {
    let data = await callout.get(CIRCLECI, `${process.env.PROJECT_SLUG}/pipeline`)
    return data.items[0].id;
}

async function getLastBuildWorkflowID(pipelineID) {
    let workflowID;
    let data = await callout.get(CIRCLECI, `/pipeline/${pipelineID}/workflow`);
    for(let workflow of data.items) {
        if(workflow.name === process.env.WORKFLOW_NAME) {
            workflowID = workflow.id;
        }
    }
    return workflowID;
}

async function getLastJobArtifacts(workflowID) {
    let data = await callout.get(CIRCLECI, `/workflow/${workflowID}/job`);
    let projectSlug = data.items[0].project_slug;
    let lastJobNumber = data.items[0].job_number;
    data = await callout.get(CIRCLECI, `/project/${projectSlug}/${lastJobNumber}/artifacts`);
    for(let item of data.items) {
        if(item.path === process.env.PACKAGE_UPDATE_PATH) {
            const {_, stderr} = exec(`wget ${item.url} --header "Circle-Token: ${process.env.CIRCLE_TOKEN}" > ../${process.env.PACKAGE_UPDATE_FILENAME}`);
            if(stderr) {
                fatal('getLastJobArtifacts()', stderr);
            }
        }
    }
}

module.exports = {
    createJob
};