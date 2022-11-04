const express = require('express');

const { createJob } = require('../controllers');

const router = express.Router();

router.post('/job', createJob);

module.exports = router;