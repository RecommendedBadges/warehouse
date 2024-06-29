const express = require('express');

const { createJob, scaleDownWarehouseWorker } = require('../controllers');

const router = express.Router();

router.post('/create', createJob);
router.post('/', scaleDownWarehouseWorker);

module.exports = router;