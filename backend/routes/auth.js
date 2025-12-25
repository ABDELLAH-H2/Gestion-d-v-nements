const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { validate, registerSchema, loginSchema } = require('../validators/validators');

// POST /api/auth/register - Register new user
router.post('/register', validate(registerSchema), register);

// POST /api/auth/login - Login user
router.post('/login', validate(loginSchema), login);

// GET /api/auth/me - Get current user (protected)
router.get('/me', authMiddleware, getMe);

module.exports = router;
