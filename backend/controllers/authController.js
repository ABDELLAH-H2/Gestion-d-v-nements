const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Cookie options helper - detects if request is over HTTPS
const getCookieOptions = (req) => {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    return {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };
};

// Register new user
const register = async (req, res) => {
    try {
        const { username, email, password } = req.validatedBody;

        // Check if user already exists
        const { rows: existingUsers } = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or username already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        const { rows: result } = await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
            [username, email, hashedPassword]
        );

        // Generate token
        const token = generateToken(result[0].id);

        // Get created user (without password)
        const { rows: users } = await pool.query(
            'SELECT id, username, email, avatar, created_at FROM users WHERE id = $1',
            [result[0].id]
        );

        // Set secure cookie
        res.cookie('token', token, getCookieOptions(req));

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: users[0].id,
                username: users[0].username,
                avatar: users[0].avatar
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { email, password } = req.validatedBody;

        // Find user
        const { rows: users } = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        // Check if user has a password (might be OAuth only)
        if (!user.password) {
            return res.status(401).json({
                success: false,
                message: 'Please log in with Google'
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate token
        const token = generateToken(user.id);

        // Remove password from response
        delete user.password;

        // Set secure cookie
        res.cookie('token', token, getCookieOptions(req));

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};

// Logout user
const logout = (req, res) => {
    const cookieOpts = getCookieOptions(req);
    delete cookieOpts.maxAge; // Remove maxAge for clearCookie
    res.clearCookie('token', cookieOpts);

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
};

// Get current user
const getMe = async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Google Auth Callback
const googleAuthCallback = (req, res) => {
    try {
        const token = generateToken(req.user.id);
        
        // Set secure cookie
        res.cookie('token', token, getCookieOptions(req));
        
        // Redirect to frontend
        res.redirect('/');
    } catch (error) {
        console.error('Google Auth Callback Error:', error);
        res.redirect('/login.html?error=auth_failed');
    }
};

module.exports = { register, login, logout, getMe, googleAuthCallback };
