const callout = require('./callout.js');
const error = require('./error.js');
const github = require('./github.js');
const sfdx = require('./sfdx.js');

module.exports = {
    fatal: error.fatal,
    getOpenPullRequestDetails: github.getOpenPullRequestDetails,
    getRemainingPackageNumber: sfdx.getRemainingPackageNumber,
    makeRequest: callout.makeRequest
};