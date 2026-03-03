class CustomError extends Error {
    constructor(message, statusCode, field = null) {
        super(message);
        this.statusCode = statusCode;
        
        // If the error pertains to a specific field (e.g., validation)
        if (field) {
             this.field = field;
        }

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = CustomError;
