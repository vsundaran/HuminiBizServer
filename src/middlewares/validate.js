const validator = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });
        
        if (error) {
            // First detailed error response
            const detailedError = {
                field: error.details[0].path[0],
                reason: error.details[0].message
            };

            return res.status(400).json({
                success: false,
                message: "Validation failed",
                error: detailedError
            });
        }
        
        next();
    };
};

module.exports = { validator };
