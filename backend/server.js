require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { testConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const favoriteRoutes = require('./routes/favorites');
const scrapingRoutes = require('./routes/scraping');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - needed for secure cookies behind reverse proxies (Vercel, Render, etc.)
app.set('trust proxy', 1);

// Middleware
app.use(cookieParser());
app.use(require('./config/passport').initialize());

// CORS configuration for cross-origin cookies
const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // Add your Vercel deployment URLs
    'https://gestion-dvnements-git-main-amin3aliouas-projects-6c824046.vercel.app',
    // Add main production URL if different
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Check if origin is in allowed list or matches Vercel pattern
        if (allowedOrigins.includes(origin) ||
            origin.endsWith('.vercel.app') ||
            origin.includes('gestion-dvnements')) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true
}));
// Increase body size limit to 50MB for base64 image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from frontend folder (for production)
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/scraping', scrapingRoutes);
app.use('/api/ai', aiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Gestion d\'Événements API is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Serve frontend for non-API routes (SPA fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

// Start server
const startServer = async () => {
    // Validate critical environment variables
    if (!process.env.JWT_SECRET) {
        console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
        process.exit(1);
    }

    try {
        await testConnection();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📍 API available at http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
