// AI Chat Route - n8n Agent Integration
// Calls n8n AI Agent workflow instead of OpenRouter directly
const express = require('express');
const router = express.Router();

// POST /api/ai/chat - Proxy chat requests to n8n AI Agent
router.post('/chat', async (req, res) => {
    try {
        const { messages, user, sessionId: clientSessionId } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        // 1. Get the last message from the user
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');

        if (!lastUserMessage) {
            return res.status(400).json({ error: 'No user message found' });
        }

        // 2. Create a Session ID for memory persistence
        // If user is logged in, use their ID. If not, use the guest session ID from frontend.
        const sessionId = user?.id
            ? `user_${user.id}`
            : (clientSessionId || 'anonymous_guest');

        console.log(`🤖 AI Agent | Session: ${sessionId} | Query: ${lastUserMessage.content}`);

        // 3. Check if n8n webhook URL is configured
        const n8nUrl = process.env.N8N_AI_AGENT_URL;

        if (!n8nUrl) {
            console.error('N8N_AI_AGENT_URL is not configured');
            return res.status(500).json({
                error: 'AI Agent not configured',
                message: 'Please set N8N_AI_AGENT_URL environment variable'
            });
        }

        // 4. Call n8n AI Agent Webhook
        console.log(`📡 Calling n8n: ${n8nUrl}`);

        const n8nResponse = await fetch(n8nUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: lastUserMessage.content,
                sessionId: sessionId,
                history: messages // Send full history if n8n needs it
            })
        });

        // Get raw response text first
        const responseText = await n8nResponse.text();
        console.log(`📥 n8n raw response:`, responseText.substring(0, 500));

        if (!n8nResponse.ok) {
            console.error('n8n Error:', n8nResponse.status, responseText);
            throw new Error(`n8n Error: ${n8nResponse.status} - ${responseText}`);
        }

        // Check for empty response
        if (!responseText || responseText.trim() === '') {
            console.error('n8n returned empty response');
            throw new Error('n8n returned empty response. Make sure the workflow is active.');
        }

        // Parse JSON safely
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse n8n response:', parseError);
            // If response is plain text, use it directly
            if (responseText && responseText.length > 0) {
                data = { output: responseText };
            } else {
                throw new Error('Invalid response from n8n workflow');
            }
        }

        // 5. Extract the answer from n8n response
        // n8n usually returns: [{ "output": "The answer..." }] or { "output": "..." }
        let aiText = "I'm having trouble connecting to my brain right now. Please try again.";

        if (Array.isArray(data) && data[0]?.output) {
            aiText = data[0].output;
        } else if (data.output) {
            aiText = data.output;
        } else if (data.text) {
            aiText = data.text;
        } else if (typeof data === 'string') {
            aiText = data;
        } else if (Array.isArray(data) && data.length > 0) {
            // Try to extract any text from the first item
            aiText = JSON.stringify(data[0]);
        }

        console.log(`✅ AI Response: ${aiText.substring(0, 100)}...`);

        // Return in the same format as before for frontend compatibility
        res.json({
            success: true,
            choices: [{ message: { content: aiText } }]
        });

    } catch (error) {
        console.error('❌ AI Controller Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process AI request',
            message: error.message
        });
    }
});

module.exports = router;
