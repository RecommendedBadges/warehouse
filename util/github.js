const callout = require('./callout.js');
const { github } = require('../config');

async function commentOnPullRequest(pullRequestNumber, commentBody) {
    callout.post('github', `/issues/${pullRequestNumber}/comments`, commentBody);
}

async function getIssueComments(issueNumber) {
    let issueComments = await callout.get('github', `/issues/${issueNumber}/comments`);
    return issueComments;
}

async function getOpenPullRequestDetails() {
    let pullRequests = await callout.get('github', '/pulls');
    for(let pullRequest of pullRequests) {
        if(pullRequest.base.ref === github.BASE_BRANCH) {
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