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
}

module.exports = new AuthController();
