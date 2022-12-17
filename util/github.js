const callout = require('./callout.js');
const config = require('../config');

async function commentOnPullRequest(pullRequestNumber, commentBody) {
    callout.post('github', `/issues/${pullRequestNumber}/comments`, commentBody);
}

async function getIssueComments(issueNumber) {
    let issueComments = await callout.get('github', `/issues/${issueNumber}/comments`);
    return issueComments;
}

async function getOpenPullRequestDetails(parameters) {
    let pullRequests = await callout.get('github', '/pulls');
    console.log(parameters.pullRequestNumber);
    for(let pullRequest of pullRequests) {

        console.log(JSON.parse(JSON.stringify(pullRequest)));
        if(
            (pullRequest.base.ref === config.BASE_BRANCH) 
            && ((parameters.pullRequestNumber && (pullRequest.number == parameters.pullRequestNumber)) || !parameters.pullRequestNumber)
        ) {
            console.log('returning value');
            return pullRequest;
        }
    }
}

async function mergeOpenPullRequest(pullRequestNumber) {
    await callout.put('github', `/pulls/${pullRequestNumber}/merge`, {});
}

module.exports = {
    commentOnPullRequest,
    getIssueComments,
    getOpenPullRequestDetails,
    mergeOpenPullRequest
};