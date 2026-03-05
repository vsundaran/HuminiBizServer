const AuthService = require('../services/AuthService');

class AuthController {
    /**
     * Request OTP
     * @route POST /auth/request-otp
     */
    async requestOtp(req, res, next) {
        try {
            const { email } = req.body;
            // The service handles domain lookup, organization check, user check, and saves OTP hash
            const result = await AuthService.requestOtp(email);
            
            res.status(200).json({
                success: true,
                message: result.message,
                data: {},
                error: null
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Verify OTP
     * @route POST /auth/verify-otp
     */
    async verifyOtp(req, res, next) {
        try {
            const { email, otp } = req.body;
            
            const result = await AuthService.verifyOtp(email, otp);
            
            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: result,
                error: null
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Refresh tokens using a valid refresh token
     * Implements token rotation: old token is revoked, new pair is issued.
     * @route POST /auth/refresh-token
     */
    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Refresh token is required',
                    data: null,
                    error: null,
                });
            }

            const tokens = await AuthService.refreshTokens(refreshToken);

            res.status(200).json({
                success: true,
                message: 'Tokens refreshed successfully',
                data: tokens,
                error: null,
            });
        } catch (error) {
            // Treat any refresh failure as 401 so the client knows to re-authenticate
            res.status(401).json({
                success: false,
                message: error.message || 'Session expired, please log in again',
                data: null,
                error: null,
            });
        }
    }

    /**
     * Logout — invalidate all refresh tokens for the user.
     * Requires a valid access token (requireAuth middleware).
     * @route POST /auth/logout
     */
    async logout(req, res, next) {
        try {
            // req.user is populated by requireAuth middleware
            await AuthService.logout(req.user.id);

            res.status(200).json({
                success: true,
                message: 'Logged out successfully',
                data: null,
                error: null,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();
