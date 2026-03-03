const Joi = require('joi');

const authValidator = {
  requestOtpSchema: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      })
  }),

  verifyOtpSchema: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    otp: Joi.string()
      .length(6)
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        'string.length': 'OTP must be exactly 6 digits',
        'string.pattern.base': 'OTP must contain only numbers',
        'any.required': 'OTP is required'
      })
  })
};

module.exports = authValidator;
