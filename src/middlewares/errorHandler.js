const CustomError = require('../utils/CustomError');

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
    // Log error for internal tracking (exclude sensitive info where applicable)
    console.error(`[Error]: ${err.message}`);

    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errorDetail = null;

    // Handle Mongoose Validation Errors
    if (err.name === 'ValidationError') {
        const firstErrorKey = Object.keys(err.errors)[0];
        statusCode = 400;
        message = 'Validation failed';
        errorDetail = {
            field: err.errors[firstErrorKey].path,
            reason: err.errors[firstErrorKey].message
        };
    }

    // Handle Mongo MongoServerError: E11000 duplicate key error
    if (err.code === 11000) {
        const fieldMap = Object.keys(err.keyPattern);
        statusCode = 400;
        message = 'Duplicate field value entered';
        errorDetail = {
            field: fieldMap.length ? fieldMap[0] : 'unknown',
            reason: 'Resource already exists'
        };
    }

    // Handle CustomError
    if (err instanceof CustomError && err.field) {
        errorDetail = {
            field: err.field,
            reason: err.message
        };
        message = "Validation failed"; // Required global format structure for field errors
    }

    // If it's a generic 500 in production, mask it to prevent leak.
    if (statusCode === 500 && process.env.NODE_ENV === 'production') {
        message = 'An unexpected error occurred';
    }

    return res.status(statusCode).json({
        success: false,
        message,
        error: errorDetail,
        data: null
    });
};

module.exports = errorHandler;
