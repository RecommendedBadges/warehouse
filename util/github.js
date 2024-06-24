const callout = require('./callout.js');
const { BASE_BRANCH } = require('../config');

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

module.exports = {
    getOpenPullRequestDetails
};