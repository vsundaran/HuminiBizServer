const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { validator } = require('../middlewares/validate');
const userValidator = require('../validators/user.validator');
const { requireAuth } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(requireAuth);

// GET /users/profile — fetch logged-in user profile
router.get('/profile', userController.getProfile);

// GET /users/stats — fetch user call stats
router.get('/stats', userController.getStats);

// GET /users/leaderboard — fetch org leaderboard
router.get('/leaderboard', userController.getLeaderboard);

// PUT /users/profile — update user profile
router.put(
    '/profile',
    validator(userValidator.updateProfileSchema),
    userController.updateProfile
);

module.exports = router;

