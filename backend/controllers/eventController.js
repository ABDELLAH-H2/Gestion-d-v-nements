const { pool } = require('../config/database');

// Get all events with pagination, search, and filters
const getEvents = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 6,
            search = '',
            type = '',
            status = '',
            sort = 'date',
            order = 'ASC'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const params = [];
        let whereClause = 'WHERE 1=1';

        // Search filter
        if (search) {
            whereClause += ' AND (name LIKE ? OR location LIKE ? OR description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Type filter
        if (type) {
            whereClause += ' AND type = ?';
            params.push(type);
        }

        // Status filter
        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        // Valid sort columns
        const validSortColumns = ['date', 'name', 'price', 'created_at'];
        const sortColumn = validSortColumns.includes(sort) ? sort : 'date';
        const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        // Get total count
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM events ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Get events with creator info
        const [events] = await pool.query(
            `SELECT e.*, u.username as creator_username, u.avatar as creator_avatar
             FROM events e
             LEFT JOIN users u ON e.creator_id = u.id
             ${whereClause}
             ORDER BY ${sortColumn} ${sortOrder}
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        // If user is authenticated, check favorites
        if (req.user) {
            const [favorites] = await pool.query(
                'SELECT event_id FROM favorites WHERE user_id = ?',
                [req.user.id]
            );
            const favoriteIds = new Set(favorites.map(f => f.event_id));

            events.forEach(event => {
                event.isFavorite = favoriteIds.has(event.id);
            });
        } else {
            events.forEach(event => {
                event.isFavorite = false;
            });
        }

        res.json({
            success: true,
            data: events,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching events'
        });
    }
};

// Get single event by ID
const getEventById = async (req, res) => {
    try {
        const { id } = req.params;

        const [events] = await pool.query(
            `SELECT e.*, u.username as creator_username, u.avatar as creator_avatar
             FROM events e
             LEFT JOIN users u ON e.creator_id = u.id
             WHERE e.id = ?`,
            [id]
        );

        if (events.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        const event = events[0];

        // Check if favorite for authenticated user
        if (req.user) {
            const [favorites] = await pool.query(
                'SELECT id FROM favorites WHERE user_id = ? AND event_id = ?',
                [req.user.id, id]
            );
            event.isFavorite = favorites.length > 0;
        } else {
            event.isFavorite = false;
        }

        res.json({
            success: true,
            data: event
        });
    } catch (error) {
        console.error('Get event by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching event'
        });
    }
};

// Create new event
const createEvent = async (req, res) => {
    try {
        const {
            name,
            type,
            description,
            date,
            end_date,
            location,
            capacity,
            price,
            status,
            image
        } = req.validatedBody;

        const [result] = await pool.query(
            `INSERT INTO events 
             (name, type, description, date, end_date, location, capacity, price, status, image, creator_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, type, description || null, date, end_date || null, location,
                capacity || 100, price || 0, status || 'upcoming', image || null, req.user.id]
        );

        // Get created event
        const [events] = await pool.query(
            `SELECT e.*, u.username as creator_username
             FROM events e
             LEFT JOIN users u ON e.creator_id = u.id
             WHERE e.id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: events[0]
        });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating event'
        });
    }
};

// Update event
const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if event exists and user is the creator
        const [existingEvents] = await pool.query(
            'SELECT * FROM events WHERE id = ?',
            [id]
        );

        if (existingEvents.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        if (existingEvents[0].creator_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update this event'
            });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        const allowedFields = ['name', 'type', 'description', 'date', 'end_date',
            'location', 'capacity', 'price', 'status', 'image'];

        for (const field of allowedFields) {
            if (req.validatedBody[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(req.validatedBody[field]);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        values.push(id);

        await pool.query(
            `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        // Get updated event
        const [events] = await pool.query(
            `SELECT e.*, u.username as creator_username
             FROM events e
             LEFT JOIN users u ON e.creator_id = u.id
             WHERE e.id = ?`,
            [id]
        );

        res.json({
            success: true,
            message: 'Event updated successfully',
            data: events[0]
        });
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating event'
        });
    }
};

// Delete event
const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if event exists and user is the creator
        const [existingEvents] = await pool.query(
            'SELECT * FROM events WHERE id = ?',
            [id]
        );

        if (existingEvents.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        if (existingEvents[0].creator_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this event'
            });
        }

        await pool.query('DELETE FROM events WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting event'
        });
    }
};

module.exports = { getEvents, getEventById, createEvent, updateEvent, deleteEvent };
