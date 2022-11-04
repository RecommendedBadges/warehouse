const { makeRequest } = require('./callout.js');
const { github } = require('../config');

async function getOpenPullRequestDetails() {
    let pullRequests = await makeRequest('github', '/pulls');
    for(let pullRequest of pullRequests) {
        if(pullRequest.base.ref === github.BASE_BRANCH) {
            return pullRequest;
        }
    }
}

module.exports = getOpenPullRequestDetails;