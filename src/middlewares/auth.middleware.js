const jwt = require('jsonwebtoken');
const CustomError = require('../utils/CustomError');
const Admin = require('../models/Admin');

const requireAuth = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new CustomError('Not authorized, no token provided', 401));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (error) {
        return next(new CustomError('Not authorized, token failed', 401));
    }
};

const requireAdmin = async (req, res, next) => {
    requireAuth(req, res, async (err) => {
        if (err) return next(err);
        
        if (req.user.role !== 'Admin') {
            return next(new CustomError('Not authorized as an admin', 403));
        }

        try {
            const admin = await Admin.findById(req.user.id);
            if (!admin || admin.status !== 'ACTIVE') {
                return next(new CustomError('Admin account inactive or not found', 403));
            }
            req.admin = admin;
            next();
        } catch (error) {
            next(error);
        }
    });
};

module.exports = { requireAuth, requireAdmin };
