const express = require('express');
const router = express.Router();
const axios = require('axios'); // Assuming axios is available or we use fetch (node 18+)
// Using native fetch for Node 18+ or standard https module if preferred, but let's stick to simple fetch if available or dynamic import
// Since this is a standard express app, let's use global fetch (Node 18+) or install axios if needed. 
// Given the constraints, I'll use standard fetch which is available in Node.js 18+ (verified in package.json engines usually, but safe to assume modern node).

router.post('/chat', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
                'X-Title': 'Gestion d\'Événements', // Corrected escaping for apostrophe
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'google/gemma-3-27b-it:free',
                messages: messages,
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter API Error:', response.status, errorText);
            return res.status(response.status).json({ error: 'AI Provider Error' });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('AI Proxy Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
