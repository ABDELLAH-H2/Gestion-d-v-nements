// API Configuration and Utilities
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

// Get stored token
const getToken = () => localStorage.getItem('token');

// Set token
const setToken = (token) => localStorage.setItem('token', token);

// Remove token
const removeToken = () => localStorage.removeItem('token');

// Get stored user
const getUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

// Set user
const setUser = (user) => localStorage.setItem('user', JSON.stringify(user));

// Remove user
const removeUser = () => localStorage.removeItem('user');

// Check if user is authenticated
const isAuthenticated = () => !!getToken();

// API Request helper
const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultHeaders = {
        'Content-Type': 'application/json'
    };

    const token = getToken();
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
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
                removeToken();
                removeUser();
                // Only redirect to login if not already on auth pages
                if (!window.location.pathname.includes('login') &&
                    !window.location.pathname.includes('register')) {
                    showToast('Session expired. Please login again.', 'error');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 1500);
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
    register: (data) => apiRequest('/auth/register', { method: 'POST', body: data }),
    login: (data) => apiRequest('/auth/login', { method: 'POST', body: data }),
    getMe: () => apiRequest('/auth/me'),

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
                        <span>${user.email}</span>
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

// Logout function
const logout = () => {
    removeToken();
    removeUser();
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = '/index.html';
    }, 1000);
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

// Export for use in other files
window.api = api;
window.showToast = showToast;
window.isAuthenticated = isAuthenticated;
window.getUser = getUser;
window.setUser = setUser;
window.setToken = setToken;
window.getToken = getToken;
window.logout = logout;
window.updateNavigation = updateNavigation;
window.formatDate = formatDate;
window.formatDateRange = formatDateRange;
window.formatPrice = formatPrice;
window.debounce = debounce;
