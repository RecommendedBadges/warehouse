const callout = require('./callout.js');
const { BASE_BRANCH } = require('../config');

async function commentOnPullRequest(pullRequestNumber, commentBody) {
    console.log(commentBody);
    callout.post('github', `/issues/${pullRequestNumber}/comments`, commentBody);
}

async function getIssueComments(issueNumber) {
    let issueComments = await callout.get({
        site: 'github',
        endpoint: `/issues/${issueNumber}/comments`
    });
    return issueComments;
}

async function getOpenPullRequestDetails(parameters) {
    let pullRequests = await callout.get({
        site: 'github',
        endpoint: '/pulls'
    });
    for(let pullRequest of pullRequests) {
        if(
            (pullRequest.base.ref === BASE_BRANCH) 
            && ((parameters.pullRequestNumber && (pullRequest.number == parameters.pullRequestNumber)) || !parameters.pullRequestNumber)
        ) {
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