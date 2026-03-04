const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const errorHandler = require('./middlewares/errorHandler');
const connectDB = require('./config/db');

// Route imports
const adminRoutes = require('./routes/admin.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const categoryRoutes = require('./routes/category.routes');
const momentRoutes = require('./routes/moment.routes');

// Connect to Database
connectDB().then(() => {
  const initAdmin = require('./utils/initAdmin');
  initAdmin();
});

const app = express();

// Security Middlewares
app.use(helmet()); // Set security HTTP headers
app.use(cors()); // Enable CORS

// Body parser
app.use(express.json({ limit: '10kb' })); // Limit body size

// Prevent NoSQL injection attacks
app.use(mongoSanitize());

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/moments', momentRoutes);

// Health check endpoint for CI/CD & DevOps
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Server is healthy' });
});

// Unknown route handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found'
  });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
