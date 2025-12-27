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
        let paramIndex = 1;

        // Search filter
        if (search) {
            whereClause += ` AND (name LIKE $${paramIndex} OR location LIKE $${paramIndex+1} OR description LIKE $${paramIndex+2})`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
            paramIndex += 3;
        }

        // Type filter
        if (type) {
            whereClause += ` AND type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        // Status filter
        if (status) {
            whereClause += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Valid sort columns
        const validSortColumns = ['date', 'name', 'price', 'created_at'];
        const sortColumn = validSortColumns.includes(sort) ? sort : 'date';
        const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        // Get total count
        const { rows: countResult } = await pool.query(
            `SELECT COUNT(*) as total FROM events ${whereClause}`,
            params
        );
        const total = parseInt(countResult[0].total);

        // Get events with creator info
        const { rows: events } = await pool.query(
            `SELECT e.*, u.username as creator_username, u.avatar as creator_avatar
             FROM events e
             LEFT JOIN users u ON e.creator_id = u.id
             ${whereClause}
             ORDER BY ${sortColumn} ${sortOrder}
             LIMIT $${paramIndex} OFFSET $${paramIndex+1}`,
            [...params, parseInt(limit), offset]
        );

        // If user is authenticated, check favorites
        if (req.user) {
            const { rows: favorites } = await pool.query(
                'SELECT event_id FROM favorites WHERE user_id = $1',
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

        const { rows: events } = await pool.query(
            `SELECT e.*, u.username as creator_username, u.avatar as creator_avatar
             FROM events e
             LEFT JOIN users u ON e.creator_id = u.id
             WHERE e.id = $1`,
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
            const { rows: favorites } = await pool.query(
                'SELECT id FROM favorites WHERE user_id = $1 AND event_id = $2',
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

        const { rows: result } = await pool.query(
            `INSERT INTO events 
             (name, type, description, date, end_date, location, capacity, price, status, image, creator_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
            [name, type, description || null, date, end_date || null, location,
                capacity || 100, price || 0, status || 'upcoming', image || null, req.user.id]
        );

        // Get created event
        const { rows: events } = await pool.query(
            `SELECT e.*, u.username as creator_username
             FROM events e
             LEFT JOIN users u ON e.creator_id = u.id
             WHERE e.id = $1`,
            [result[0].id]
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
        const { rows: existingEvents } = await pool.query(
            'SELECT * FROM events WHERE id = $1',
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

        let paramIndex = 1;
        for (const field of allowedFields) {
            if (req.validatedBody[field] !== undefined) {
                updates.push(`${field} = $${paramIndex}`);
                values.push(req.validatedBody[field]);
                paramIndex++;
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
            `UPDATE events SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
            values
        );

        // Get updated event
        const { rows: events } = await pool.query(
            `SELECT e.*, u.username as creator_username
             FROM events e
             LEFT JOIN users u ON e.creator_id = u.id
             WHERE e.id = $1`,
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
        const { rows: existingEvents } = await pool.query(
            'SELECT * FROM events WHERE id = $1',
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

        await pool.query('DELETE FROM events WHERE id = $1', [id]);

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
