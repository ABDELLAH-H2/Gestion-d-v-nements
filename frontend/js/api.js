// API Configuration and Utilities
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `http://${window.location.hostname}:3000/api`
    : '/api';

// State management (in-memory)
let currentUser = null;
let authPromise = null;

// Get current user (from memory)
const getUser = () => currentUser;

// Set user (to memory)
const setUser = (user) => {
    currentUser = user;
    updateNavigation();
};

// Check if user is authenticated
const isAuthenticated = () => !!currentUser;

// API Request helper
const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultHeaders = {
        'Content-Type': 'application/json'
    };

    const config = {
        ...options,
        credentials: 'include', // Important: This sends cookies with the request
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            // Handle 401 Unauthorized
            if (response.status === 401) {
                // Only reset user if we were previously logged in or trying to access protected route
                if (currentUser && !window.location.pathname.includes('login')) {
                    currentUser = null;
                    updateNavigation();
                    showToast('Session expired. Please login again.', 'error');
                }
            }
            throw new Error(data.message || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// API Methods
const api = {
    // Auth
    init: () => {
        if (!authPromise) {
            // Only fetch user if we are NOT on login/register pages
            if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
                authPromise = api.getMe()
                    .then(response => {
                        if (response && response.success && response.user) {
                            // setUser is already called inside getMe if successful, 
                            // but let's return the user for the promise chain
                            return response.user;
                        }
                        return null;
                    })
                    .catch(() => null);
            } else {
                authPromise = Promise.resolve(null);
            }
        }
        return authPromise;
    },
    register: async (data) => {
        const response = await apiRequest('/auth/register', { method: 'POST', body: data });
        if (response.success && response.user) {
            setUser(response.user);
        }
        return response;
    },
    login: async (data) => {
        const response = await apiRequest('/auth/login', { method: 'POST', body: data });
        if (response.success && response.user) {
            setUser(response.user);
        }
        return response;
    },
    logout: async () => {
        try {
            await apiRequest('/auth/logout', { method: 'POST' });
        } finally {
            currentUser = null;
            updateNavigation();
            showToast('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1000);
        }
    },
    getMe: async () => {
        try {
            const response = await apiRequest('/auth/me');
            if (response.success && response.user) {
                setUser(response.user);
            }
            return response;
        } catch (error) {
            // If getMe fails, we don't necessarily want to nuke everything immediately
            // unless we are sure it's an auth error (handled in apiRequest)
            // But if it fails, currentUser remains null (initial state)
            return null;
        }
    },

    // Events
    getEvents: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/events${queryString ? '?' + queryString : ''}`);
    },
    getEvent: (id) => apiRequest(`/events/${id}`),
    createEvent: (data) => apiRequest('/events', { method: 'POST', body: data }),
    updateEvent: (id, data) => apiRequest(`/events/${id}`, { method: 'PUT', body: data }),
    deleteEvent: (id) => apiRequest(`/events/${id}`, { method: 'DELETE' }),

    // Favorites
    getFavorites: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/favorites/my-favorites${queryString ? '?' + queryString : ''}`);
    },
    addFavorite: (eventId) => apiRequest(`/favorites/${eventId}`, { method: 'POST' }),
    removeFavorite: (eventId) => apiRequest(`/favorites/${eventId}`, { method: 'DELETE' }),

    // Scraping
    triggerScraping: (data) => apiRequest('/scraping/trigger', { method: 'POST', body: data }),
    getScrapedVenues: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/scraping/venues${queryString ? '?' + queryString : ''}`);
    }
};

// Toast Notification System
const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

const showToast = (message, type = 'success', duration = 4000) => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning'
    };

    toast.innerHTML = `
        <span class="material-symbols-outlined toast-icon">${icons[type] || 'info'}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <span class="material-symbols-outlined">close</span>
        </button>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

// Format date helpers
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
};

const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const startFormatted = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (!endDate) return startFormatted;

    const end = new Date(endDate);
    const endFormatted = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // If same month
    if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()} - ${end.getDate()}`;
    }

    return `${startFormatted} - ${endFormatted}`;
};

// Format price
const formatPrice = (price) => {
    if (!price || price === 0) return 'Free';
    return `$${parseFloat(price).toFixed(0)}`;
};

// Debounce function
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Update navigation based on auth state
const updateNavigation = () => {
    const user = getUser();
    const userMenus = document.querySelectorAll('.user-menu');

    userMenus.forEach(menu => {
        if (user) {
            menu.innerHTML = `
                <button class="notification-btn">
                    <span class="material-symbols-outlined">notifications</span>
                    <span class="notification-dot"></span>
                </button>
                <div class="user-avatar" 
                     style="background-image: url('${user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username) + '&background=6366F1&color=fff'}')"
                     title="${user.username}"
                     onclick="toggleUserDropdown()">
                </div>
                <div class="user-dropdown hidden" id="userDropdown">
                    <div class="dropdown-header">
                        <strong>${user.username}</strong>
                        <span>${user.email || ''}</span>
                    </div>
                    <a href="/favorites.html" class="dropdown-item">
                        <span class="material-symbols-outlined">favorite</span>
                        My Favorites
                    </a>
                    <a href="/automation.html" class="dropdown-item">
                        <span class="material-symbols-outlined">smart_toy</span>
                        Automation
                    </a>
                    <button class="dropdown-item" onclick="logout()">
                        <span class="material-symbols-outlined">logout</span>
                        Logout
                    </button>
                </div>
            `;
        } else {
            menu.innerHTML = `
                <a href="/login.html" class="btn btn-ghost">Login</a>
                <a href="/register.html" class="btn btn-primary">Sign Up</a>
            `;
        }
    });
};

// Logout function - using api.logout instead
const logout = () => {
    api.logout();
};

// Toggle user dropdown
const toggleUserDropdown = () => {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
};

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('userDropdown');
    const avatar = document.querySelector('.user-avatar');
    if (dropdown && !dropdown.contains(e.target) && e.target !== avatar) {
        dropdown.classList.add('hidden');
    }
});

// Initialize app: Check for existing session
document.addEventListener('DOMContentLoaded', () => {
    // Clean up old localStorage data from previous version (now using secure cookies instead)
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Initialize auth check
    api.init();
});

// Export for use in other files
window.api = api;
window.showToast = showToast;
window.isAuthenticated = isAuthenticated;
window.getUser = getUser;
window.setUser = setUser;
window.logout = logout;
window.updateNavigation = updateNavigation;
window.formatDate = formatDate;
window.formatDateRange = formatDateRange;
window.formatPrice = formatPrice;
window.debounce = debounce;
