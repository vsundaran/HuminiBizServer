const bcrypt = require('bcryptjs');
const CustomError = require('../utils/CustomError');
const OrganizationDomain = require('../models/OrganizationDomain');
const Organization = require('../models/Organization');
const User = require('../models/User');
const OtpVerification = require('../models/OtpVerification');
const EmailService = require('./EmailService');
const TokenService = require('./TokenService');

class AuthService {
    /**
     * Generates a random 6 digit OTP string
     * @returns {string} OTP
     */
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Extract domain from email
     * @param {string} email 
     * @returns {string} domain
     */
    extractDomain(email) {
        const parts = email.split('@');
        if (parts.length !== 2) {
            throw new CustomError('Invalid email format', 400, 'email');
        }
        return parts[1].toLowerCase();
    }

    /**
     * Step 1: Request OTP - Handles organization lookup, user validation, and OTP generation
     * @param {string} email 
     */
    async requestOtp(email) {
        const normalizedEmail = email.toLowerCase().trim();
        const domain = this.extractDomain(normalizedEmail);

        // Find domain mapping
        const domainMapping = await OrganizationDomain.findOne({ domain }).populate('organizationId');
        if (!domainMapping || !domainMapping.organizationId) {
            throw new CustomError('Organization not found for this domain', 404, 'email');
        }

        const organization = domainMapping.organizationId;
        
        // Validate Organization status
        if (organization.status !== 'ACTIVE') {
            throw new CustomError('Organization is currently inactive or suspended', 403);
        }

        // Fetch or create user (Just-In-Time Provisioning)
        let user = await User.findOne({ 
            email: normalizedEmail,
            organizationId: organization._id 
        });

        if (!user) {
            // Auto-onboard the user since their domain matches an active organization
            user = await User.create({
                email: normalizedEmail,
                organizationId: organization._id,
                status: 'ACTIVE'
            });
        } else if (user.status !== 'ACTIVE') {
            throw new CustomError('User account is inactive or suspended', 403, 'email');
        }

        // Generate OTP
        const otpString = this.generateOtp();
        
        // Hash OTP before storing
        const salt = await bcrypt.genSalt(10);
        const hashedOtp = await bcrypt.hash(otpString, salt);

        // Delete any existing OTP for this email to prevent spam/abuse
        await OtpVerification.deleteMany({ email: normalizedEmail });

        // Save new OTP with 5 min expiry
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 5);

        await OtpVerification.create({
            email: normalizedEmail,
            hash: hashedOtp,
            expiresAt
        });

        const sendResult = await EmailService.sendOTP(normalizedEmail, otpString);
        
        if (!sendResult.success) {
            // Depending on reliability, you may not want to fail the user entirely, but for auth we must.
            throw new CustomError('Failed to send OTP email', 500);
        }

        return { message: 'OTP sent successfully' };
    }

    /**
     * Step 2: Verify OTP
     * @param {string} email 
     * @param {string} otp 
     */
    async verifyOtp(email, otp) {
        const normalizedEmail = email.toLowerCase().trim();

        // Find OTP record
        const otpRecord = await OtpVerification.findOne({ email: normalizedEmail });

        if (!otpRecord) {
            throw new CustomError('OTP not found or expired', 400, 'otp');
        }

        // Check verification attempts
        if (otpRecord.attempts >= 3) {
            await OtpVerification.deleteOne({ _id: otpRecord._id });
            throw new CustomError('Maximum OTP attempts exceeded. Please request a new one', 400, 'otp');
        }

        // Increment attempts tracker
        otpRecord.attempts += 1;
        await otpRecord.save();

        // Check expiry manually (even though TTL index is there)
        if (new Date() > otpRecord.expiresAt) {
            await OtpVerification.deleteOne({ _id: otpRecord._id });
            throw new CustomError('OTP has expired', 400, 'otp');
        }

        // Verify hash
        const isValid = await otpRecord.compareOtp(otp);

        if (!isValid) {
            throw new CustomError('Invalid OTP', 400, 'otp');
        }

        // OTP is valid - proceed to issue token
        
        // Find User to embed in token
        const user = await User.findOne({ email: normalizedEmail }).populate('organizationId', 'name status');
        
        if (!user || user.status !== 'ACTIVE') {
            throw new CustomError('User account is invalid or inactive', 403);
        }

        // Cleanup OTP record
        await OtpVerification.deleteOne({ _id: otpRecord._id });

        // Update last login
        user.lastLoginAt = new Date();
        await user.save();

        // Create Token Payload mapping cross-organization & general needs
        const tokenPayload = {
            id: user._id,
            email: user.email,
            organizationId: user.organizationId._id,
            role: 'User' // Ready for future role-based expansion
        };

        const accessToken = TokenService.generateAccessToken(tokenPayload);
        const refreshToken = TokenService.generateRefreshToken(tokenPayload);

        // Persist refresh token (start a new token family)
        const { family } = await TokenService.storeRefreshToken(
            refreshToken,
            user._id,
            user.organizationId._id,
        );

        return {
            accessToken,
            refreshToken,
            tokenFamily: family,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                jobRole: user.jobRole,
                organization: user.organizationId.name,
                isProfileUpdated: user.isProfileUpdated,
                lastLoginAt: user.lastLoginAt
            }
        };
    }

    /**
     * Rotate refresh token — issue a new access + refresh token pair.
     * Revokes the old refresh token and stores the new one in the same family.
     * @param {string} oldRefreshToken
     */
    async refreshTokens(oldRefreshToken) {
        // Validate, detect reuse, and consume the old token
        const { record, decoded } = await TokenService.validateAndConsumeRefreshToken(oldRefreshToken);

        // Make sure user still exists and is active
        const user = await User.findById(decoded.id).populate('organizationId', 'name status');
        if (!user || user.status !== 'ACTIVE') {
            throw new CustomError('User account is inactive', 403);
        }

        const tokenPayload = {
            id: user._id,
            email: user.email,
            organizationId: user.organizationId._id,
            role: decoded.role ?? 'User'
        };

        const newAccessToken  = TokenService.generateAccessToken(tokenPayload);
        const newRefreshToken = TokenService.generateRefreshToken(tokenPayload);

        // Store new refresh token in the SAME family to enable reuse detection
        await TokenService.storeRefreshToken(
            newRefreshToken,
            user._id,
            user.organizationId._id,
            record.family,
        );

        return {
            accessToken:  newAccessToken,
            refreshToken: newRefreshToken,
        };
    }

    /**
     * Logout — revoke all refresh tokens for the user.
     * @param {string} userId
     */
    async logout(userId) {
        await TokenService.revokeAllUserTokens(userId);
    }
}

module.exports = new AuthService();

