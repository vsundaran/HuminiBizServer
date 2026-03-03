const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middlewares/auth.middleware');
const rateLimit = require('express-rate-limit');

// Rate limiter for OTP requests
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many OTP requests from this IP, please try again after 15 minutes', error: null, data: null }
});

// Authentication logic (Public Endpoints, meant for Admins to initiate login)
router.post('/request-otp', otpLimiter, adminController.requestOtp.bind(adminController));
router.post('/verify-otp', otpLimiter, adminController.verifyOtp.bind(adminController));

// All routes below require Admin authorization
router.use(requireAdmin);

// Self Profile
router.get('/me', adminController.getMe.bind(adminController));

// Admins Management
router.get('/admins', adminController.getAdmins.bind(adminController));
router.post('/admins', adminController.addAdmin.bind(adminController));

// Organizations Management
router.get('/organizations', adminController.getOrganizations.bind(adminController));
router.post('/organizations', adminController.addOrganization.bind(adminController));

// Domains Management
router.get('/domains', adminController.getDomains.bind(adminController));
router.post('/domains', adminController.addDomain.bind(adminController));

module.exports = router;
