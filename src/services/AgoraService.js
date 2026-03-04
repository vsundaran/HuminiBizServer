const { RtcTokenBuilder, RtcRole } = require('agora-token');

class AgoraService {
    constructor() {
        this.appId = process.env.AGORA_APP_ID;
        this.appCertificate = process.env.AGORA_APP_CERTIFICATE;

        if (!this.appId || !this.appCertificate) {
            console.warn('⚠️  Agora credentials not found in environment variables');
        }
    }

    /**
     * Generate RTC token for video calling
     * @param {string} channelName - The channel name (we'll use callId)
     * @param {number} uid - User ID (0 for auto-assignment, or specific user ID)
     * @param {string} role - 'publisher' or 'subscriber' (default: 'publisher')
     * @param {number} expirationTimeInSeconds - Token expiration time (default: 24 hours)
     * @returns {Object} - Token and expiration info
     */
    generateRtcToken(channelName, uid = 0, role = 'publisher', expirationTimeInSeconds = 86400) {
        try {
            if (!this.appId || !this.appCertificate) {
                throw new Error('Agora App ID or App Certificate is missing');
            }

            if (!channelName) {
                throw new Error('Channel name is required');
            }

            // Convert role string to Agora role constant
            const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

            // Calculate privilege expiration time (current time + expiration duration)
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

            // Build the token
            const token = RtcTokenBuilder.buildTokenWithUid(
                this.appId,
                this.appCertificate,
                channelName,
                uid,
                agoraRole,
                privilegeExpiredTs
            );

            return {
                token,
                appId: this.appId,
                channelName,
                uid,
                expiresAt: new Date(privilegeExpiredTs * 1000).toISOString(),
                expiresIn: expirationTimeInSeconds
            };
        } catch (error) {
            console.error('Error generating Agora RTC token:', error);
            throw error;
        }
    }

    /**
     * Validate if Agora credentials are configured
     * @returns {boolean}
     */
    isConfigured() {
        return !!(this.appId && this.appCertificate);
    }
}

module.exports = new AgoraService();
