const common = require('./components/common.js');
const github = require('./components/github.js');
const sfdx = require('./components/sfdx.js');

module.exports = Object.assign({}, common, github, sfdx);