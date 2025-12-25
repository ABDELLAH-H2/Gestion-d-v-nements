const express = require('express');
const router = express.Router();
const { addFavorite, removeFavorite, getMyFavorites } = require('../controllers/favoriteController');
const { authMiddleware } = require('../middleware/auth');

// All favorites routes are protected

// GET /api/favorites/my-favorites - Get user's favorite events
router.get('/my-favorites', authMiddleware, getMyFavorites);

// POST /api/favorites/:eventId - Add event to favorites
router.post('/:eventId', authMiddleware, addFavorite);

// DELETE /api/favorites/:eventId - Remove event from favorites
router.delete('/:eventId', authMiddleware, removeFavorite);

module.exports = router;
