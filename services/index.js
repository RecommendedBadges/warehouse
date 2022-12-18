const jobService = require('./jobService.js');
const workerService = require('./workerService.js');

module.exports = Object.assign({}, jobService, workerService);