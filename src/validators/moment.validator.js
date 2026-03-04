const Joi = require('joi');

const momentValidator = {
  createMomentSchema: Joi.object({
    categoryId: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Category ID must be a valid Object ID',
        'any.required': 'Category ID is required'
      }),
    subcategoryId: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Subcategory ID must be a valid Object ID',
        'any.required': 'Subcategory ID is required'
      }),
    description: Joi.string()
      .trim()
      .max(200)
      .required()
      .messages({
        'string.max': 'Description cannot exceed 200 characters',
        'any.required': 'Description is required'
      }),
    startDateTime: Joi.date()
      .iso()
      .required()
      .messages({
        'date.format': 'Start date time must be in ISO format',
        'any.required': 'Start date time is required'
      }),
    endDateTime: Joi.date()
      .iso()
      .min(Joi.ref('startDateTime'))
      .required()
      .messages({
        'date.format': 'End date time must be in ISO format',
        'date.min': 'End date time must be after start date time',
        'any.required': 'End date time is required'
      })
  })
};

module.exports = momentValidator;
