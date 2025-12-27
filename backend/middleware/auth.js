const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authMiddleware = async (req, res, next) => {
    try {
        let token;

        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const { rows: users } = await pool.query(
            'SELECT id, username, email, avatar, created_at FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. User not found.'
            });
        }

        // Attach user to request
        req.user = users[0];
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired.'
            });
        }
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during authentication.'
        });
    }
};

// Optional auth - doesn't fail if no token, but attaches user if present
const optionalAuth = async (req, res, next) => {
    try {
        let token;
        
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const { rows: users } = await pool.query(
            'SELECT id, username, email, avatar, created_at FROM users WHERE id = $1',
            [decoded.userId]
        );

        req.user = users.length > 0 ? users[0] : null;
        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

module.exports = { authMiddleware, optionalAuth };
