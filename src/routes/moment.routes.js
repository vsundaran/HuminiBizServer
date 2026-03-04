const express = require('express');
const router = express.Router();
const momentController = require('../controllers/moment.controller');
const { validator } = require('../middlewares/validate');
const momentValidator = require('../validators/moment.validator');
const { requireAuth } = require('../middlewares/auth.middleware');

// Protected routes - requires authentication
router.use(requireAuth);

router.post(
    '/',
    validator(momentValidator.createMomentSchema),
    momentController.createMoment
);

router.get('/my', momentController.getMyMoments);

router.put('/:id/status', momentController.toggleMomentStatus);

router.post('/:id/like', momentController.toggleLikeMoment);

router.get('/live', momentController.getLiveMoments);
router.get('/upcoming', momentController.getUpcomingMoments);
router.get('/later', momentController.getLaterMoments);

module.exports = router;
