const { pool } = require('../config/database');

// Trigger n8n scraping workflow
const triggerScraping = async (req, res) => {
    try {
        const { city, keyword } = req.validatedBody;
        const userEmail = req.user.email;

        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

        if (!n8nWebhookUrl) {
            return res.status(503).json({
                success: false,
                message: 'Scraping service is not configured'
            });
        }

        // Call n8n webhook
        const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                city,
                keyword,
                userEmail,
                triggeredAt: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`n8n webhook responded with status ${response.status}`);
        }

        const result = await response.json();

        // Log the scraping trigger
        await pool.query(
            `INSERT INTO scraped_venues (name, city, keyword) 
             VALUES ('Scraping triggered', ?, ?)`,
            [city, keyword]
        );

        res.json({
            success: true,
            message: 'Scraping workflow triggered successfully',
            sheetUrl: result.sheetUrl || null,
            data: result
        });
    } catch (error) {
        console.error('Trigger scraping error:', error);
        
        // Return n8n error message if available
        const message = error.message.includes('n8n') 
            ? error.message 
            : 'Failed to trigger scraping workflow. Please check the system logs.';

        res.status(500).json({
            success: false,
            message
        });
    }
};

// Get scraped venues
const getScrapedVenues = async (req, res) => {
    try {
        const { city, keyword, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (city) {
            whereClause += ' AND city = ?';
            params.push(city);
        }

        if (keyword) {
            whereClause += ' AND keyword = ?';
            params.push(keyword);
        }

        // Get total count
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM scraped_venues ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Get venues
        const [venues] = await pool.query(
            `SELECT * FROM scraped_venues 
             ${whereClause}
             ORDER BY scraped_at DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        res.json({
            success: true,
            data: venues,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get scraped venues error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching scraped venues'
        });
    }
};

module.exports = { triggerScraping, getScrapedVenues };
