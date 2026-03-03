const jwt = require('jsonwebtoken');

class TokenService {
    /**
     * Generate an access token
     * @param {Object} payload 
     * @returns {string} token
     */
    generateAccessToken(payload) {
        return jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m'
        });
    }

    /**
     * Generate a refresh token
     * @param {Object} payload 
     * @returns {string} token
     */
    generateRefreshToken(payload) {
        return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d'
        });
    }

    /**
     * Verify an access token
     * @param {string} token 
     * @returns {Object} decoded payload
     */
    verifyAccessToken(token) {
        return jwt.verify(token, process.env.JWT_SECRET);
    }

    /**
     * Verify a refresh token
     * @param {string} token 
     * @returns {Object} decoded payload
     */
    verifyRefreshToken(token) {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    }
}

module.exports = new TokenService();
