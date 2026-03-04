const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    unique: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address'],
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required'],
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'ACTIVE',
  },
  name: {
    type: String,
    trim: true,
  },
  department: {
    type: String,
    trim: true,
  },
  jobRole: {
    type: String,
    trim: true,
  },
  isProfileUpdated: {
    type: Boolean,
    default: false,
  },
  lastLoginAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for fast querying
userSchema.index({ organizationId: 1 });

module.exports = mongoose.model('User', userSchema);
