const express = require('express');
const router = express.Router();
const {
    getEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent
} = require('../controllers/eventController');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { validate, eventSchema, eventUpdateSchema } = require('../validators/validators');

// GET /api/events - Get all events (public, with optional auth for favorites)
router.get('/', optionalAuth, getEvents);

// GET /api/events/:id - Get single event (public, with optional auth for favorites)
router.get('/:id', optionalAuth, getEventById);

// POST /api/events - Create event (protected)
router.post('/', authMiddleware, validate(eventSchema), createEvent);

// PUT /api/events/:id - Update event (protected, owner only)
router.put('/:id', authMiddleware, validate(eventUpdateSchema), updateEvent);

// DELETE /api/events/:id - Delete event (protected, owner only)
router.delete('/:id', authMiddleware, deleteEvent);

module.exports = router;
