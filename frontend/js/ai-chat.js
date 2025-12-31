// AI Chat Module - OpenRouter API Integration
// Uses backend proxy to protect API keys

const API_URL = '/api/ai/chat';

// System prompt to train the AI about your website
const SYSTEM_PROMPT = `You are a helpful AI assistant for "Gestion d'Événements", an event discovery and management platform.

Your role is to help users:
- Find events by type (conferences, concerts, workshops, meetups), date, or location
- Understand how to use the platform features
- Get recommendations for events
- Navigate the website (events page, favorites, automation, venues)

Platform features:
- Browse events with filters (type, status)
- Search events by name, location, or tags
- Save favorite events
- View event details including price, capacity, and dates
- Automation features for event scraping

Be friendly, concise, and helpful. Use emojis occasionally to be engaging.
If asked about specific events, suggest checking the events page or using the search bar.
Always respond in the same language the user uses.`;

// Chat state
let chatHistory = [];
let isChatOpen = false;
let isLoading = false;

// Initialize chat UI
const initAIChat = () => {
    createChatUI();
    attachEventListeners();
};

// Create chat UI elements
const createChatUI = () => {
    // Create floating chat button
    const chatButton = document.createElement('button');
    chatButton.id = 'aiChatButton';
    chatButton.className = 'ai-chat-button';
    chatButton.innerHTML = `
        <span class="material-symbols-outlined">smart_toy</span>
        <span class="chat-button-pulse"></span>
    `;
    document.body.appendChild(chatButton);

    // Create chat modal
    const chatModal = document.createElement('div');
    chatModal.id = 'aiChatModal';
    chatModal.className = 'ai-chat-modal';
    chatModal.innerHTML = `
        <div class="ai-chat-container">
            <div class="ai-chat-header">
                <div class="ai-chat-header-info">
                    <div class="ai-avatar">
                        <span class="material-symbols-outlined">smart_toy</span>
                    </div>
                    <div class="ai-header-text">
                        <h4>AI Assistant</h4>
                        <span class="ai-status">Online</span>
                    </div>
                </div>
                <button class="ai-chat-close" id="aiChatClose">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="ai-chat-messages" id="aiChatMessages">
                <div class="ai-welcome-message">
                    <div class="ai-avatar small">
                        <span class="material-symbols-outlined">smart_toy</span>
                    </div>
                    <div class="ai-message">
                        <p>👋 Hello! I'm your AI assistant for Gestion d'Événements.</p>
                        <p>I can help you find events, get recommendations, or navigate the platform. What would you like to know?</p>
                    </div>
                </div>
            </div>
            <div class="ai-chat-input-container">
                <div class="ai-typing-indicator hidden" id="aiTypingIndicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <form id="aiChatForm" class="ai-chat-form">
                    <input type="text" id="aiChatInput" placeholder="Ask me anything about events..." autocomplete="off">
                    <button type="submit" id="aiSendButton">
                        <span class="material-symbols-outlined">send</span>
                    </button>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(chatModal);
};

// Attach event listeners
const attachEventListeners = () => {
    const chatButton = document.getElementById('aiChatButton');
    const chatClose = document.getElementById('aiChatClose');
    const chatForm = document.getElementById('aiChatForm');
    const chatModal = document.getElementById('aiChatModal');

    chatButton.addEventListener('click', toggleChat);
    chatClose.addEventListener('click', toggleChat);
    chatForm.addEventListener('submit', handleSubmit);

    // Close on outside click
    chatModal.addEventListener('click', (e) => {
        if (e.target === chatModal) {
            toggleChat();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isChatOpen) {
            toggleChat();
        }
    });
};

// Toggle chat visibility
const toggleChat = () => {
    const chatModal = document.getElementById('aiChatModal');
    const chatButton = document.getElementById('aiChatButton');

    isChatOpen = !isChatOpen;

    chatModal.classList.toggle('active', isChatOpen);
    chatButton.classList.toggle('active', isChatOpen);

    if (isChatOpen) {
        document.getElementById('aiChatInput').focus();
    }
};

// Handle form submission
const handleSubmit = async (e) => {
    e.preventDefault();

    const input = document.getElementById('aiChatInput');
    const message = input.value.trim();

    if (!message || isLoading) return;

    // Add user message
    addMessage(message, 'user');
    input.value = '';

    // Show typing indicator
    showTypingIndicator(true);
    isLoading = true;

    try {
        const response = await sendMessage(message);
        addMessage(response, 'ai');
    } catch (error) {
        console.error('AI Chat Error:', error);
        addMessage('Sorry, I encountered an error. Please try again later. 😔', 'ai');
    } finally {
        showTypingIndicator(false);
        isLoading = false;
    }
};

// Add message to chat
const addMessage = (content, sender) => {
    const messagesContainer = document.getElementById('aiChatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;

    if (sender === 'ai') {
        messageDiv.innerHTML = `
            <div class="ai-avatar small">
                <span class="material-symbols-outlined">smart_toy</span>
            </div>
            <div class="ai-message">
                <p>${formatMessage(content)}</p>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="user-message-content">
                <p>${escapeHtml(content)}</p>
            </div>
        `;
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Update chat history for context
    chatHistory.push({
        role: sender === 'user' ? 'user' : 'assistant',
        content: content
    });

    // Keep only last 10 messages for context
    if (chatHistory.length > 10) {
        chatHistory = chatHistory.slice(-10);
    }
};

// Send message to Backend API Proxy (n8n AI Agent)
const sendMessage = async (message) => {
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...chatHistory,
        { role: 'user', content: message }
    ];

    // Get user from the global state (set by api.js)
    const user = window.getUser ? window.getUser() : null;

    // Generate or retrieve a guest session ID for non-logged-in users
    let guestSessionId = localStorage.getItem('guest_session_id');
    if (!guestSessionId) {
        guestSessionId = 'guest_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('guest_session_id', guestSessionId);
    }

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for auth
        body: JSON.stringify({
            messages: messages,
            user: user,                           // Send user info for memory
            sessionId: user ? null : guestSessionId  // Fallback session for guests
        })
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
};

// Show/hide typing indicator
const showTypingIndicator = (show) => {
    const indicator = document.getElementById('aiTypingIndicator');
    indicator.classList.toggle('hidden', !show);

    const messagesContainer = document.getElementById('aiChatMessages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

// Format AI message (basic markdown support)
const formatMessage = (text) => {
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
};

// Escape HTML to prevent XSS
const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAIChat);

// Export for debugging
window.aiChat = {
    toggle: toggleChat,
    sendMessage,
    chatHistory: () => chatHistory
};
