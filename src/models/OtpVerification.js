const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
  },
  hash: {
    type: String,
    required: [true, 'OTP hash is required'],
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration time is required'],
  },
  attempts: {
    type: Number,
    default: 0,
    max: [3, 'Maximum verification attempts exceeded'],
  },
}, {
  timestamps: true,
});

// Index for rapid email lookups
otpVerificationSchema.index({ email: 1 });

// TTL index to automatically delete expired documents
// Note: Document expires 60 seconds after expiresAt to allow for race conditions, 
// actual validation logic will check the precise expiresAt date.
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 });

/**
 * Compare plain text OTP with hashed OTP
 * @param {string} candidateOtp
 * @returns {Promise<boolean>}
 */
otpVerificationSchema.methods.compareOtp = async function (candidateOtp) {
  return bcrypt.compare(candidateOtp, this.hash);
};

module.exports = mongoose.model('OtpVerification', otpVerificationSchema);
