const Admin = require('../models/Admin');
const Organization = require('../models/Organization');
const OrganizationDomain = require('../models/OrganizationDomain');
const OtpVerification = require('../models/OtpVerification');
const CustomError = require('../utils/CustomError');
const EmailService = require('../services/EmailService');
const TokenService = require('../services/TokenService');
const bcrypt = require('bcryptjs');

class AdminController {
    // Generate OTP Helper
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // --- AUTHENTICATION ---
    async requestOtp(req, res, next) {
        try {
            const { email } = req.body;
            if (!email) return next(new CustomError('Email is required', 400));
            const normalizedEmail = email.toLowerCase().trim();

            const admin = await Admin.findOne({ email: normalizedEmail });
            if (!admin || admin.status !== 'ACTIVE') {
                return next(new CustomError('Admin not found or inactive', 403));
            }

            const otpString = this.generateOtp();
            const salt = await bcrypt.genSalt(10);
            const hashedOtp = await bcrypt.hash(otpString, salt);

            await OtpVerification.deleteMany({ email: normalizedEmail });

            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 5);

            await OtpVerification.create({
                email: normalizedEmail,
                hash: hashedOtp,
                expiresAt
            });

            const sendResult = await EmailService.sendOTP(normalizedEmail, otpString);
            if (!sendResult.success) {
                return next(new CustomError('Failed to send OTP email', 500));
            }

            res.status(200).json({ success: true, message: 'OTP sent successfully', data: {}, error: null });
        } catch (error) {
            next(error);
        }
    }

    async verifyOtp(req, res, next) {
        try {
            const { email, otp } = req.body;
            if (!email || !otp) return next(new CustomError('Email and OTP required', 400));
            const normalizedEmail = email.toLowerCase().trim();

            const otpRecord = await OtpVerification.findOne({ email: normalizedEmail });
            if (!otpRecord) return next(new CustomError('OTP not found or expired', 400));

            if (otpRecord.attempts >= 3) {
                await OtpVerification.deleteOne({ _id: otpRecord._id });
                return next(new CustomError('Maximum OTP attempts exceeded. Please request a new one', 400));
            }

            otpRecord.attempts += 1;
            await otpRecord.save();

            if (new Date() > otpRecord.expiresAt) {
                await OtpVerification.deleteOne({ _id: otpRecord._id });
                return next(new CustomError('OTP has expired', 400));
            }

            const isValid = await otpRecord.compareOtp(otp); 
            if (!isValid) return next(new CustomError('Invalid OTP', 400));

            const admin = await Admin.findOne({ email: normalizedEmail });
            if (!admin || admin.status !== 'ACTIVE') return next(new CustomError('Admin invalid or inactive', 403));

            await OtpVerification.deleteOne({ _id: otpRecord._id });
            
            admin.lastLoginAt = new Date();
            await admin.save();

            const tokenPayload = {
                id: admin._id,
                email: admin.email,
                role: 'Admin'
            };

            const accessToken = TokenService.generateAccessToken(tokenPayload);
            const refreshToken = TokenService.generateRefreshToken(tokenPayload);

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: { accessToken, refreshToken, admin: { id: admin._id, email: admin.email } },
                error: null
            });
        } catch (error) {
            next(error);
        }
    }

    async getMe(req, res, next) {
        res.status(200).json({ success: true, message: 'Admin profile', data: req.admin, error: null });
    }

    // --- ADMIN MANAGEMENT ---
    async getAdmins(req, res, next) {
        try {
            const admins = await Admin.find().select('-__v');
            res.status(200).json({ success: true, message: 'Admins fetched', data: admins, error: null });
        } catch (error) { next(error); }
    }

    async addAdmin(req, res, next) {
        try {
            const { email } = req.body;
            if (!email) return next(new CustomError('Email is required', 400));
            const normalizedEmail = email.toLowerCase().trim();
            const existing = await Admin.findOne({ email: normalizedEmail });
            if (existing) return next(new CustomError('Admin already exists', 400));

            const newAdmin = await Admin.create({ email: normalizedEmail, status: 'ACTIVE' });
            res.status(201).json({ success: true, message: 'Admin created', data: newAdmin, error: null });
        } catch (error) { next(error); }
    }

    // --- ORGANIZATION MANAGEMENT ---
    async getOrganizations(req, res, next) {
        try {
            const orgs = await Organization.find().select('-__v');
            res.status(200).json({ success: true, message: 'Organizations fetched', data: orgs, error: null });
        } catch (error) { next(error); }
    }

    async addOrganization(req, res, next) {
        try {
            const { name } = req.body;
            if (!name) return next(new CustomError('Name is required', 400));
            const existing = await Organization.findOne({ name: name.trim() });
            if (existing) return next(new CustomError('Organization already exists', 400));
            
            const org = await Organization.create({ name: name.trim(), status: 'ACTIVE' });
            res.status(201).json({ success: true, message: 'Organization created', data: org, error: null });
        } catch (error) { next(error); }
    }

    // --- DOMAIN MANAGEMENT ---
    async getDomains(req, res, next) {
        try {
            const domains = await OrganizationDomain.find().populate('organizationId', 'name').select('-__v');
            res.status(200).json({ success: true, message: 'Domains fetched', data: domains, error: null });
        } catch (error) { next(error); }
    }

    async addDomain(req, res, next) {
        try {
            const { organizationId, domain } = req.body;
            if (!organizationId || !domain) return next(new CustomError('OrganizationID and Domain required', 400));
            const normalizedDomain = domain.toLowerCase().trim();

            const org = await Organization.findById(organizationId);
            if (!org) return next(new CustomError('Organization not found', 404));

            const existing = await OrganizationDomain.findOne({ domain: normalizedDomain });
            if (existing) return next(new CustomError('Domain already mapped to an organization', 400));
            
            const orgDomain = await OrganizationDomain.create({ organizationId, domain: normalizedDomain });
            res.status(201).json({ success: true, message: 'Domain added', data: orgDomain, error: null });
        } catch (error) { next(error); }
    }
}

module.exports = new AdminController();
