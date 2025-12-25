const { pool } = require('../config/database');

// Add event to favorites
const addFavorite = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user.id;

        // Check if event exists
        const [events] = await pool.query(
            'SELECT id FROM events WHERE id = ?',
            [eventId]
        );

        if (events.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Check if already favorited
        const [existing] = await pool.query(
            'SELECT id FROM favorites WHERE user_id = ? AND event_id = ?',
            [userId, eventId]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Event is already in your favorites'
            });
        }

        // Add to favorites
        await pool.query(
            'INSERT INTO favorites (user_id, event_id) VALUES (?, ?)',
            [userId, eventId]
        );

        res.status(201).json({
            success: true,
            message: 'Event added to favorites'
        });
    } catch (error) {
        console.error('Add favorite error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while adding to favorites'
        });
    }
};

// Remove event from favorites
const removeFavorite = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user.id;

        // Check if favorite exists
        const [existing] = await pool.query(
            'SELECT id FROM favorites WHERE user_id = ? AND event_id = ?',
            [userId, eventId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event is not in your favorites'
            });
        }

        // Remove from favorites
        await pool.query(
            'DELETE FROM favorites WHERE user_id = ? AND event_id = ?',
            [userId, eventId]
        );

        res.json({
            success: true,
            message: 'Event removed from favorites'
        });
    } catch (error) {
        console.error('Remove favorite error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while removing from favorites'
        });
    }
};

// Get user's favorite events
const getMyFavorites = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get total count
        const [countResult] = await pool.query(
            'SELECT COUNT(*) as total FROM favorites WHERE user_id = ?',
            [userId]
        );
        const total = countResult[0].total;

        // Get favorite events
        const [favorites] = await pool.query(
            `SELECT e.*, u.username as creator_username, f.created_at as favorited_at
             FROM favorites f
             JOIN events e ON f.event_id = e.id
             LEFT JOIN users u ON e.creator_id = u.id
             WHERE f.user_id = ?
             ORDER BY f.created_at DESC
             LIMIT ? OFFSET ?`,
            [userId, parseInt(limit), offset]
        );

        // Mark all as favorites
        favorites.forEach(event => {
            event.isFavorite = true;
        });

        res.json({
            success: true,
            data: favorites,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching favorites'
        });
    }
};

module.exports = { addFavorite, removeFavorite, getMyFavorites };
