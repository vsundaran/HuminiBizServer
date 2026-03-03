const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validator } = require('../middlewares/validate');
const authValidator = require('../validators/auth.validator');
const rateLimit = require('express-rate-limit');

// Rate limit definition for OTP routes (Prevent brute force and spam)
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 OTP requests per windowMs
    message: {
        success: false,
        message: 'Too many OTP requests from this IP, please try again after 15 minutes',
        error: null,
        data: null
    }
});

router.post(
    '/request-otp',
    otpLimiter,
    validator(authValidator.requestOtpSchema),
    authController.requestOtp
);

router.post(
    '/verify-otp',
    otpLimiter,
    validator(authValidator.verifyOtpSchema),
    authController.verifyOtp
);

module.exports = router;
