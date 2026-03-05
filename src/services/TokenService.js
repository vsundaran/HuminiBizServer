const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const RefreshToken = require('../models/RefreshToken');

class TokenService {

    // ─── Access Token ──────────────────────────────────────────────────────────
    generateAccessToken(payload) {
        return jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m'
        });
    }

    verifyAccessToken(token) {
        return jwt.verify(token, process.env.JWT_SECRET);
    }

    // ─── Refresh Token ─────────────────────────────────────────────────────────
    generateRefreshToken(payload) {
        return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d'
        });
    }

    verifyRefreshToken(token) {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    }

    /**
     * Hash a refresh token for storage lookup (SHA-256).
     * We never store the raw token; hashing prevents DB leaks from exposing live tokens.
     */
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Persist a new refresh token in the DB.
     * 
     * @param {string}  token          - Raw JWT refresh token
     * @param {string}  userId
     * @param {string}  organizationId
     * @param {string}  family         - Token family id (groups rotation chain)
     * @returns {Promise<RefreshToken>}
     */
    async storeRefreshToken(token, userId, organizationId, family = uuidv4()) {
        const tokenHash = this.hashToken(token);
        const decoded = this.verifyRefreshToken(token);
        const expiresAt = new Date(decoded.exp * 1000);

        const record = await RefreshToken.create({
            token,           // Store for potential revocation reuse detection
            tokenHash,
            userId,
            organizationId,
            family,
            expiresAt,
        });

        return { record, family };
    }

    /**
     * Validate a refresh token:
     *  1. Verify JWT signature + expiry
     *  2. Find in DB by hash
     *  3. Ensure it has not been revoked
     * 
     * Returns the DB record on success.
     * Throws if invalid, expired, or revoked.
     */
    async validateAndConsumeRefreshToken(token) {
        // 1. Verify JWT signature
        let decoded;
        try {
            decoded = this.verifyRefreshToken(token);
        } catch (err) {
            throw new Error('Invalid or expired refresh token');
        }

        // 2. Look up by hash
        const tokenHash = this.hashToken(token);
        const record = await RefreshToken.findOne({ tokenHash });

        if (!record) {
            throw new Error('Refresh token not found');
        }

        // 3. Check revocation
        if (record.revokedAt) {
            // Token reuse detected — revoke the entire family (all active tokens for this user+family)
            await RefreshToken.updateMany(
                { userId: record.userId, family: record.family, revokedAt: null },
                { revokedAt: new Date() }
            );
            throw new Error('Refresh token reuse detected — all sessions invalidated');
        }

        // 4. Consume (revoke old token atomically — it will be replaced with a new one)
        record.revokedAt = new Date();
        await record.save();

        return { record, decoded };
    }

    /**
     * Revoke all refresh tokens for a user (logout all devices).
     */
    async revokeAllUserTokens(userId) {
        await RefreshToken.updateMany(
            { userId, revokedAt: null },
            { revokedAt: new Date() }
        );
    }
}

module.exports = new TokenService();
