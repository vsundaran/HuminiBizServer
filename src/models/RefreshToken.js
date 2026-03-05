const mongoose = require('mongoose');

/**
 * Stores issued refresh tokens so we can:
 *   1. Blacklist tokens after rotation (prevent token reuse)
 *   2. Invalidate ALL sessions for a user on logout
 * 
 * TTL index automatically removes expired documents after 7 days.
 */
const refreshTokenSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true,
            // Do NOT index the full token string — hash it for lookup instead
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true, // Efficient O(1) lookup
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true, // For efficient "logout all devices" invalidation
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
        },
        family: {
            type: String, // Groups tokens to detect reuse attacks (rotation family)
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        revokedAt: {
            type: Date,
            default: null, // null = active, Date = revoked
        },
    },
    {
        timestamps: true,
    }
);

// TTL index: MongoDB auto-deletes documents after expiresAt
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
