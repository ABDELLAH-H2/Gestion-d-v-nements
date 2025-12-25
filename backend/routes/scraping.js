const express = require('express');
const router = express.Router();
const { triggerScraping, getScrapedVenues } = require('../controllers/scrapingController');
const { authMiddleware } = require('../middleware/auth');
const { validate, scrapingSchema } = require('../validators/validators');

// POST /api/scraping/trigger - Trigger n8n scraping workflow (protected)
router.post('/trigger', authMiddleware, validate(scrapingSchema), triggerScraping);

// GET /api/scraping/venues - Get scraped venues (protected)
router.get('/venues', authMiddleware, getScrapedVenues);

module.exports = router;
