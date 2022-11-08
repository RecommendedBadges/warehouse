const callout = require('./callout.js');
const error = require('./error.js');
const github = require('./github.js');
const heroku = require('./heroku.js');
const sfdx = require('./sfdx.js');

module.exports = {
    authorize: sfdx.authorize,
    callout,
    fatal: error.fatal,
    github,
    getRemainingPackageNumber: sfdx.getRemainingPackageNumber,
    heroku
};