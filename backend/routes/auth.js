const express = require('express');
const router = express.Router();
const passport = require('passport');
const { register, login, logout, getMe, googleAuthCallback } = require('../controllers/authController');
const { validate, registerSchema, loginSchema } = require('../validators/validators');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', authMiddleware, getMe);

// Google Auth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  googleAuthCallback
);

module.exports = router;