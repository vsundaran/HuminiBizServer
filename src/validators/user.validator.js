const Joi = require('joi');

const userValidator = {
  updateProfileSchema: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.base': 'Name should be a type of text',
        'string.empty': 'Name cannot be an empty field',
        'string.min': 'Name should have a minimum length of {#limit}',
        'string.max': 'Name should have a maximum length of {#limit}',
        'any.required': 'Name is a required field',
      }),
    department: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.base': 'Department should be a type of text',
        'string.empty': 'Department cannot be an empty field',
        'any.required': 'Department is a required field',
      }),
    jobRole: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.base': 'Job Role should be a type of text',
        'string.empty': 'Job Role cannot be an empty field',
        'any.required': 'Job Role is a required field',
      }),
  })
};

module.exports = userValidator;
