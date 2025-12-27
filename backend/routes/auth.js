const express = require('express');
const router = express.Router();
const { register, login, logout, getMe } = require('../controllers/authController');
const { validate, registerSchema, loginSchema } = require('../validators/validators');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', authMiddleware, getMe);

module.exports = router;