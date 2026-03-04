const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// Protected route - requires authentication
router.get(
    '/',
    requireAuth,
    categoryController.getCategories
);

module.exports = router;
