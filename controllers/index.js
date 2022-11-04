const jobController = require('./job-controller.js');

console.log(jobController.createJob);

module.exports = {
    createJob: jobController.createJob
};