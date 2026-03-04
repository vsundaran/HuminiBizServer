const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { validator } = require('../middlewares/validate');
const userValidator = require('../validators/user.validator');
const { requireAuth } = require('../middlewares/auth.middleware');

// Protected route - requires authentication
router.put(
    '/profile',
    requireAuth,
    validator(userValidator.updateProfileSchema),
    userController.updateProfile
);

module.exports = router;
