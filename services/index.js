const jobService = require('./jobService.js');
const workerService = require('./workerService.js');

module.exports = {
    orchestrate: workerService.orchestrate,
    queueJob: jobService.queueJob,
    setupScheduledJob: workerService.setupScheduledJob
};