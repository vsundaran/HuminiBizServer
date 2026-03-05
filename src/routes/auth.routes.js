const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validator } = require('../middlewares/validate');
const authValidator = require('../validators/auth.validator');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middlewares/auth.middleware');

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: 'Too many OTP requests from this IP, please try again after 15 minutes',
        error: null,
        data: null
    }
});

// Stricter limit for refresh token endpoint (prevent brute-force token cycling)
const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: {
        success: false,
        message: 'Too many token refresh requests, please try again later',
        error: null,
        data: null
    }
});

// ─── OTP Auth Routes ──────────────────────────────────────────────────────────
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

// ─── Token Management Routes ──────────────────────────────────────────────────

/**
 * POST /auth/refresh-token
 * Public route — exchanges a valid refresh token for a new access + refresh token pair.
 * No access token required (it may be expired).
 */
router.post('/refresh-token', refreshLimiter, authController.refreshToken);

/**
 * POST /auth/logout
 * Protected route — revokes ALL refresh tokens for the authenticated user.
 * Client should also clear local token storage after calling this.
 */
router.post('/logout', requireAuth, authController.logout);

module.exports = router;

