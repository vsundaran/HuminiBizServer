const express = require('express');
const router = express.Router();
const callReportController = require('../controllers/callReport.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// Routes
router.use(requireAuth); // Protect all reporting routes

router.get('/reasons', callReportController.getReasons);
router.post('/', callReportController.submitReport);

module.exports = router;
