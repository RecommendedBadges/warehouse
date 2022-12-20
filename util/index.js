const callout = require('./callout.js');
const error = require('./error.js');
const github = require('./github.js');
const heroku = require('./heroku.js');
const sfdx = require('./sfdx.js');

module.exports = Object.assign({}, callout, error, github, heroku, sfdx);