const mongoose = require('mongoose');

const organizationDomainSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: [true, 'Domain is required'],
    trim: true,
    lowercase: true,
    unique: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required'],
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('OrganizationDomain', organizationDomainSchema);
