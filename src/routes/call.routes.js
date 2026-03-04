const express = require('express');
const router = express.Router();
const callController = require('../controllers/call.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// Protect all call routes
router.use(requireAuth);

router.post('/initiate', callController.initiateCall);
router.put('/:id/status', callController.updateCallState);
router.get('/', callController.getCallHistory);

module.exports = router;
