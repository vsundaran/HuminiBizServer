const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const errorHandler = require('./middlewares/errorHandler');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth.routes');

// Connect to Database
connectDB();

const app = express();

// Security Middlewares
app.use(helmet()); // Set security HTTP headers
app.use(cors()); // Enable CORS
app.use(mongoSanitize()); // Prevent NoSQL injection attacks

// Body parser
app.use(express.json({ limit: '10kb' })); // Limit body size

// Routes
app.use('/auth', authRoutes);

// Health check endpoint for CI/CD & DevOps
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Server is healthy' });
});

// Unknown route handler
app.all('*', (req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        data: null,
        error: null
    });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
