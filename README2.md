# EventScraper Hub - Detailed Code Documentation (README2.md)

This document provides a comprehensive line-by-line explanation of every file in the project.

---

## Table of Contents

1. [Backend Files](#backend-files)
   - [server.js](#serverjs---main-server-entry-point)
   - [config/database.js](#configdatabasejs---database-connection)
   - [middleware/auth.js](#middlewareauthjs---jwt-authentication)
   - [validators/validators.js](#validatorsvalidatorsjs---input-validation)
   - [controllers/authController.js](#controllersauthcontrollerjs---authentication-logic)
   - [controllers/eventController.js](#controllerseventcontrollerjs---event-crud-operations)
   - [controllers/favoriteController.js](#controllersfavoritecontrollerjs---favorites-management)
   - [controllers/scrapingController.js](#controllersscrapingcontrollerjs---n8n-integration)
   - [routes/auth.js](#routesauthjs---authentication-routes)
   - [routes/events.js](#routeseventsjs---event-routes)
   - [routes/favorites.js](#routesfavoritesjs---favorites-routes)
   - [routes/scraping.js](#routesscrapingjs---scraping-routes)
2. [Frontend Files](#frontend-files)
   - [js/api.js](#jsapijs---api-utilities)
   - [js/events.js](#jseventsjs---events-page-logic)
   - [css/styles.css](#cssstylescss---styling)
3. [Configuration Files](#configuration-files)

---

# Backend Files

---

## server.js - Main Server Entry Point

This is the main entry point for the Express.js backend server.

```javascript
// Import required modules
const express = require('express');
```
- **`require('express')`**: Imports the Express.js framework, which is used to create web servers and handle HTTP requests in Node.js.

```javascript
const cors = require('cors');
```
- **`require('cors')`**: Imports the CORS (Cross-Origin Resource Sharing) middleware. This allows the frontend (running on a different port/domain) to make requests to the backend.

```javascript
const path = require('path');
```
- **`require('path')`**: Imports Node.js built-in `path` module for handling file paths across different operating systems (Windows uses `\`, Unix uses `/`).

```javascript
require('dotenv').config();
```
- **`require('dotenv').config()`**: Loads environment variables from a `.env` file into `process.env`. This allows storing sensitive data (like database passwords) outside of code.

```javascript
const { pool, testConnection } = require('./config/database');
```
- **Destructuring import**: Imports `pool` (database connection pool) and `testConnection` (function to verify database connectivity) from the database configuration file.

```javascript
// Import routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const favoriteRoutes = require('./routes/favorites');
const scrapingRoutes = require('./routes/scraping');
```
- **Route imports**: Each file contains Express Router with specific endpoints:
  - `authRoutes`: `/register`, `/login`, `/me`
  - `eventRoutes`: CRUD operations for events
  - `favoriteRoutes`: Add/remove favorites
  - `scrapingRoutes`: n8n webhook trigger

```javascript
const app = express();
```
- **`express()`**: Creates an Express application instance. This `app` object is used to configure middleware, routes, and start the server.

```javascript
// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    credentials: true
}));
```
- **`app.use()`**: Registers middleware that runs for every request.
- **`cors({...})`**: Configures CORS with options:
  - **`origin`**: Specifies which domains can make requests. In production, uses `FRONTEND_URL` env variable. In development, allows localhost on ports 3000 and 5500.
  - **`credentials: true`**: Allows cookies/auth headers to be sent with requests.

```javascript
app.use(express.json());
```
- **`express.json()`**: Built-in middleware that parses incoming JSON request bodies. Without this, `req.body` would be `undefined` for JSON requests.

```javascript
app.use(express.urlencoded({ extended: true }));
```
- **`express.urlencoded()`**: Parses URL-encoded form data (like from HTML forms). `extended: true` allows nested objects.

```javascript
// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));
```
- **`express.static()`**: Serves static files (HTML, CSS, JS, images) from the specified directory.
- **`path.join(__dirname, '../frontend')`**: Creates absolute path to frontend folder. `__dirname` is the current file's directory.

```javascript
// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/scraping', scrapingRoutes);
```
- **Route mounting**: Each route file is mounted at a specific path prefix:
  - `/api/auth/register` → handled by `authRoutes`
  - `/api/events/` → handled by `eventRoutes`
  - etc.

```javascript
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'EventScraper Hub API is running',
        timestamp: new Date().toISOString()
    });
});
```
- **Health check**: A simple endpoint to verify the server is running. Used for monitoring and load balancers.
- **`res.json()`**: Sends a JSON response with content-type header automatically set.

```javascript
// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});
```
- **404 for API**: Catches any API route that doesn't exist and returns a 404 error.
- **`'/api/*'`**: Wildcard matches any path starting with `/api/`.
- **`res.status(404)`**: Sets HTTP status code before sending response.

```javascript
// Serve frontend for non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
```
- **Catch-all route**: For Single Page Apps (SPAs), any non-API route serves `index.html`. This allows frontend routing to work.
- **`res.sendFile()`**: Sends a file as the response.

```javascript
// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});
```
- **Error handler middleware**: Has 4 parameters (err, req, res, next) which tells Express this is an error handler.
- **`console.error()`**: Logs error to server console for debugging.
- **`err.status || 500`**: Uses error's status code or defaults to 500 (Internal Server Error).

```javascript
// Start server
const PORT = process.env.PORT || 3000;
```
- **Port configuration**: Uses environment variable or defaults to 3000. Essential for deployment platforms that assign dynamic ports.

```javascript
const startServer = async () => {
    try {
        await testConnection();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📍 Local: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};
```
- **`async` function**: Allows using `await` for asynchronous operations.
- **`await testConnection()`**: Waits for database connection to be verified before starting server.
- **`app.listen(PORT, callback)`**: Starts HTTP server on specified port. Callback runs when server is ready.
- **`process.exit(1)`**: Terminates Node.js process with error code 1 (indicates failure).

```javascript
startServer();
```
- **Function call**: Executes the server startup function.

---

## config/database.js - Database Connection

Manages MySQL database connection using a connection pool.

```javascript
const mysql = require('mysql2/promise');
```
- **`mysql2/promise`**: Imports MySQL driver with Promise support. `/promise` variant returns Promises instead of callbacks, enabling async/await.

```javascript
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'eventscraper_hub',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
```
- **`createPool()`**: Creates a connection pool instead of single connection. Pools reuse connections, improving performance.
- **`host`**: Database server address (usually `localhost` for local development).
- **`user`**: MySQL username.
- **`password`**: MySQL password (empty string for XAMPP default).
- **`database`**: Which database to use.
- **`port`**: MySQL port (default 3306).
- **`waitForConnections: true`**: If all connections are in use, new requests wait instead of failing.
- **`connectionLimit: 10`**: Maximum 10 simultaneous connections.
- **`queueLimit: 0`**: No limit on waiting requests (0 = unlimited).

```javascript
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        throw error;
    }
};
```
- **`pool.getConnection()`**: Gets a connection from the pool.
- **`connection.release()`**: Returns connection to pool for reuse. **Critical**: forgetting this causes connection leaks.
- **`throw error`**: Re-throws error so caller can handle it.

```javascript
module.exports = { pool, testConnection };
```
- **`module.exports`**: Exports objects so other files can import them.

---

## middleware/auth.js - JWT Authentication

Handles JWT token verification for protected routes.

```javascript
const jwt = require('jsonwebtoken');
```
- **`jsonwebtoken`**: Library for creating and verifying JSON Web Tokens (JWTs).

```javascript
const { pool } = require('../config/database');
```
- **Database import**: Needed to verify user exists in database.

```javascript
const authMiddleware = async (req, res, next) => {
```
- **Middleware function**: Express middleware receives `req`, `res`, and `next`. Must call `next()` to continue to next middleware/route.

```javascript
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
```
- **`req.headers.authorization`**: Gets the Authorization header. Typically contains `Bearer <token>`.

```javascript
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }
```
- **Token validation**: Checks if header exists and starts with "Bearer " (with space).
- **401 status**: Unauthorized - client needs to authenticate.
- **`return`**: Stops execution here, doesn't call `next()`.

```javascript
        const token = authHeader.split(' ')[1];
```
- **`split(' ')[1]`**: Splits "Bearer eyJhbG..." by space and takes the second part (the actual token).

```javascript
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
```
- **`jwt.verify()`**: Decodes and validates the token using the secret key. Throws error if invalid or expired.
- **`decoded`**: Contains the payload (e.g., `{ id: 1, email: 'test@example.com' }`).

```javascript
        // Check if user still exists
        const [users] = await pool.query(
            'SELECT id, username, email, avatar FROM users WHERE id = ?',
            [decoded.id]
        );
```
- **`pool.query()`**: Executes SQL query. Returns array where first element is results.
- **`[users]`**: Destructures to get just the results array.
- **`?` placeholder**: Prevents SQL injection. Value `decoded.id` is safely escaped.

```javascript
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User no longer exists'
            });
        }
```
- **User existence check**: Token might be valid but user deleted. Must verify.

```javascript
        // Attach user to request
        req.user = users[0];
        next();
```
- **`req.user`**: Attaches user data to request object. Available in subsequent middleware/routes.
- **`next()`**: Passes control to next middleware or route handler.

```javascript
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
```
- **Error handling**: Different JWT errors get specific messages:
  - `JsonWebTokenError`: Malformed or tampered token
  - `TokenExpiredError`: Token past its expiration date

```javascript
const optionalAuth = async (req, res, next) => {
```
- **Optional auth**: Same as `authMiddleware` but doesn't block if no token. Used for public routes that show extra data to logged-in users.

---

## validators/validators.js - Input Validation

Uses Joi library for schema-based validation.

```javascript
const Joi = require('joi');
```
- **Joi**: Powerful schema validation library. Describes what data should look like and validates against it.

```javascript
const validate = (schema) => {
    return (req, res, next) => {
```
- **Higher-order function**: Returns a middleware function. This pattern allows passing the schema as parameter.

```javascript
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });
```
- **`schema.validate()`**: Validates `req.body` against the schema.
- **`abortEarly: false`**: Reports ALL validation errors, not just the first one.
- **`stripUnknown: true`**: Removes fields not defined in schema (prevents extra data).
- **Destructuring**: `error` contains validation errors (if any), `value` contains cleaned data.

```javascript
        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
```
- **`error.details`**: Array of all validation errors.
- **`detail.path`**: Array of field path (e.g., `['user', 'email']`).
- **`join('.')`**: Converts to string `'user.email'`.

```javascript
        req.validatedBody = value;
        next();
```
- **`req.validatedBody`**: Stores validated and cleaned data. Controllers use this instead of `req.body`.

```javascript
const registerSchema = Joi.object({
    username: Joi.string().min(3).max(50).required()
        .messages({
            'string.min': 'Username must be at least 3 characters',
            'string.max': 'Username cannot exceed 50 characters',
            'any.required': 'Username is required'
        }),
```
- **`Joi.object()`**: Defines an object schema.
- **`Joi.string()`**: Field must be a string.
- **`.min(3)`**: Minimum 3 characters.
- **`.max(50)`**: Maximum 50 characters.
- **`.required()`**: Field is mandatory.
- **`.messages()`**: Custom error messages for each validation rule.

```javascript
    email: Joi.string().email().required(),
```
- **`.email()`**: Built-in email format validation (checks for @, domain, etc.).

```javascript
    password: Joi.string().min(6).required()
```
- **`.min(6)`**: Password must be at least 6 characters.

```javascript
const eventSchema = Joi.object({
    type: Joi.string().valid('conference', 'concert', 'workshop', 'meetup').required(),
```
- **`.valid()`**: Field must be one of these exact values (enum validation).

```javascript
    date: Joi.date().iso().required(),
```
- **`Joi.date()`**: Must be a valid date.
- **`.iso()`**: Expects ISO 8601 format (YYYY-MM-DD).

```javascript
    capacity: Joi.number().integer().min(1).default(100),
```
- **`Joi.number()`**: Must be a number.
- **`.integer()`**: No decimals allowed.
- **`.default(100)`**: If not provided, uses 100.

```javascript
    price: Joi.number().min(0).default(0),
```
- **`.min(0)`**: Cannot be negative.

---

## controllers/authController.js - Authentication Logic

Handles user registration, login, and profile retrieval.

```javascript
const bcrypt = require('bcryptjs');
```
- **bcryptjs**: Library for hashing passwords. Never store plain-text passwords!

```javascript
const jwt = require('jsonwebtoken');
```
- **jsonwebtoken**: For creating JWT tokens after successful login.

```javascript
const register = async (req, res) => {
    try {
        const { username, email, password } = req.validatedBody;
```
- **Destructuring**: Extracts validated fields from request body.

```javascript
        // Check if user exists
        const [existingUsers] = await pool.query(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
```
- **Duplicate check**: Queries database for existing email or username.
- **Multiple placeholders**: Each `?` replaced by corresponding array element in order.

```javascript
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
```
- **`bcrypt.genSalt(10)`**: Generates random salt with cost factor 10 (higher = slower but more secure).
- **`bcrypt.hash()`**: Hashes password with salt. Result looks like `$2a$10$ABC123...`.

```javascript
        // Create user
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
```
- **INSERT query**: Creates new row in users table.
- **`result.insertId`**: Auto-generated ID of new row.

```javascript
        // Generate JWT
        const token = jwt.sign(
            { id: result.insertId, email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
```
- **`jwt.sign()`**: Creates a token with:
  - **Payload**: `{ id, email }` - data stored in token
  - **Secret**: Used to sign/verify token
  - **Options**: `expiresIn` sets token expiration (7 days)

```javascript
const login = async (req, res) => {
    // ... find user by email ...
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
```
- **`bcrypt.compare()`**: Safely compares plain-text password with hashed password. Returns `true` or `false`.
- **Important**: Never compare hashes directly! `bcrypt.compare()` handles the salt.

---

## controllers/eventController.js - Event CRUD Operations

Handles Create, Read, Update, Delete operations for events.

```javascript
const getEvents = async (req, res) => {
    const {
        page = 1,
        limit = 6,
        search = '',
        type = '',
        status = '',
        sort = 'date',
        order = 'ASC'
    } = req.query;
```
- **`req.query`**: Contains URL query parameters (e.g., `?page=2&limit=10`).
- **Default values**: `page = 1` means if not provided, use 1.

```javascript
    const offset = (parseInt(page) - 1) * parseInt(limit);
```
- **Pagination offset**: For page 2 with limit 6, offset = (2-1)*6 = 6. Skips first 6 rows.
- **`parseInt()`**: Converts string (from URL) to number.

```javascript
    let whereClause = 'WHERE 1=1';
```
- **`1=1` trick**: Always true condition. Makes it easy to append more conditions with `AND`.

```javascript
    if (search) {
        whereClause += ' AND (name LIKE ? OR location LIKE ? OR description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
```
- **`LIKE`**: SQL pattern matching.
- **`%${search}%`**: `%` is wildcard. Matches "tech" in "Global Tech Summit".
- **`params.push()`**: Adds values for each `?` placeholder.

```javascript
    // Get total count
    const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM events ${whereClause}`,
        params
    );
    const total = countResult[0].total;
```
- **`COUNT(*)`**: Counts all matching rows.
- **`countResult[0].total`**: First row, `total` column.

```javascript
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
```
- **`e.*`**: All columns from events table.
- **`LEFT JOIN`**: Includes events even if creator doesn't exist (deleted user).
- **`ON e.creator_id = u.id`**: Join condition - matches events to their creators.
- **`ORDER BY`**: Sorts results.
- **`LIMIT ? OFFSET ?`**: Pagination - take X rows, skip Y rows.
- **`[...params, limit, offset]`**: Spreads existing params and adds new ones.

```javascript
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
    }
```
- **`new Set()`**: Creates a Set for O(1) lookup performance.
- **`favorites.map(f => f.event_id)`**: Extracts just the IDs.
- **`favoriteIds.has(event.id)`**: Checks if event is in user's favorites.

```javascript
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
```
- **`Math.ceil()`**: Rounds up. 13 items with limit 6 = 3 pages (not 2.17).

```javascript
const createEvent = async (req, res) => {
    const [result] = await pool.query(
        `INSERT INTO events 
         (name, type, description, date, end_date, location, capacity, price, status, image, creator_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, type, description || null, date, end_date || null, location,
            capacity || 100, price || 0, status || 'upcoming', image || null, req.user.id]
    );
```
- **`|| null`**: If value is falsy (empty string, undefined), use NULL.
- **`req.user.id`**: Creator ID from authenticated user (set by auth middleware).

```javascript
const updateEvent = async (req, res) => {
    // Check if user is the creator
    if (existingEvents[0].creator_id !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'You are not authorized to update this event'
        });
    }
```
- **Authorization check**: Only event creator can edit/delete.
- **403 Forbidden**: User is authenticated but not allowed to perform action.

```javascript
    // Build update query dynamically
    const updates = [];
    const values = [];
    const allowedFields = ['name', 'type', 'description', ...];

    for (const field of allowedFields) {
        if (req.validatedBody[field] !== undefined) {
            updates.push(`${field} = ?`);
            values.push(req.validatedBody[field]);
        }
    }
```
- **Dynamic query building**: Only updates fields that were provided, not all fields.
- **`!== undefined`**: Distinguishes between "not provided" and "explicitly set to null".

---

# Frontend Files

---

## js/api.js - API Utilities

Central file for all API communication.

```javascript
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';
```
- **Dynamic base URL**: Uses full URL in development, relative path in production.
- **`window.location.hostname`**: Current page's domain.

```javascript
const getToken = () => localStorage.getItem('token');
const setToken = (token) => localStorage.setItem('token', token);
const removeToken = () => localStorage.removeItem('token');
```
- **`localStorage`**: Browser storage that persists across sessions.
- **`getItem/setItem/removeItem`**: CRUD operations for storage.

```javascript
const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
```
- **Template literal**: Combines base URL with endpoint (e.g., `/events`).

```javascript
    const defaultHeaders = {
        'Content-Type': 'application/json'
    };

    const token = getToken();
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
```
- **`Content-Type`**: Tells server we're sending JSON.
- **`Authorization: Bearer`**: Standard format for JWT authentication.

```javascript
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };
```
- **Spread operator `...`**: Merges objects. Later properties override earlier ones.

```javascript
    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }
```
- **`JSON.stringify()`**: Converts JavaScript object to JSON string for transmission.

```javascript
    try {
        const response = await fetch(url, config);
        const data = await response.json();
```
- **`fetch()`**: Modern browser API for HTTP requests.
- **`await response.json()`**: Parses JSON response body.

```javascript
        if (!response.ok) {
            if (response.status === 401) {
                removeToken();
                removeUser();
                if (!window.location.pathname.includes('login')) {
                    showToast('Session expired. Please login again.', 'error');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 1500);
                }
            }
            throw new Error(data.message || 'Request failed');
        }
```
- **`response.ok`**: True if status is 200-299.
- **Auto logout on 401**: Clears tokens and redirects to login.
- **`setTimeout`**: Delays redirect so user can see the toast message.

```javascript
const api = {
    register: (data) => apiRequest('/auth/register', { method: 'POST', body: data }),
    login: (data) => apiRequest('/auth/login', { method: 'POST', body: data }),
    getEvents: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/events${queryString ? '?' + queryString : ''}`);
    },
```
- **API object**: Groups all API calls in one place.
- **`URLSearchParams`**: Converts object to URL query string (`{ page: 1 }` → `page=1`).

```javascript
const showToast = (message, type = 'success', duration = 4000) => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
```
- **`document.createElement()`**: Creates HTML element in memory.
- **Dynamic class**: `toast-success`, `toast-error`, etc.

```javascript
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
```
- **`appendChild()`**: Adds element to DOM.
- **Two timeouts**: First waits `duration`, then animates out, then removes element.

---

## js/events.js - Events Page Logic

Handles the main events listing page functionality.

```javascript
let currentPage = 1;
let currentType = '';
let currentStatus = '';
let currentSearch = '';
let totalPages = 1;
let allEvents = [];
```
- **State variables**: Track current filter/pagination state. Using `let` because they change.

```javascript
document.addEventListener('DOMContentLoaded', () => {
    updateNavigation();
    setupEventListeners();
    loadEvents();
    updateCreateButtonVisibility();
});
```
- **`DOMContentLoaded`**: Fires when HTML is parsed (before images load). Safer than `window.onload`.
- **Initialization functions**: Set up the page when it loads.

```javascript
const setupEventListeners = () => {
    const filterChips = document.getElementById('filterChips');
    filterChips.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip')) {
```
- **Event delegation**: Single listener on parent catches clicks on any child. More efficient than listeners on each chip.
- **`e.target`**: The actual element clicked.
- **`classList.contains()`**: Checks if element has a specific CSS class.

```javascript
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce((e) => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        loadEvents();
    }, 300));
```
- **`input` event**: Fires on every keystroke.
- **`debounce()`**: Waits 300ms after typing stops before calling function. Prevents API spam.
- **`.trim()`**: Removes whitespace from start/end.

```javascript
const loadEvents = async (append = false) => {
    if (!append) {
        eventsGrid.innerHTML = '';
        loadingState.classList.remove('hidden');
    }
```
- **`append` parameter**: If true, adds to existing events (load more). If false, replaces all.
- **`innerHTML = ''`**: Clears all children.
- **`classList.remove('hidden')`**: Shows loading spinner.

```javascript
const createEventCard = (event, user) => {
    const statusBadgeClass = {
        'upcoming': 'badge-upcoming',
        'completed': 'badge-completed',
        'cancelled': 'badge-cancelled'
    }[event.status] || 'badge-upcoming';
```
- **Object lookup**: Maps status to CSS class. `['upcoming']` retrieves `'badge-upcoming'`.
- **`|| 'badge-upcoming'`**: Fallback if status doesn't match.

```javascript
    return `
        <article class="card event-card" data-id="${event.id}">
```
- **Template literal**: Multiline string with embedded expressions `${...}`.
- **`data-id`**: Custom data attribute for storing event ID on element.

```javascript
    <button class="favorite-btn ${event.isFavorite ? 'active' : ''}"
            onclick="toggleFavorite(${event.id}, this)">
```
- **Ternary operator**: `condition ? trueValue : falseValue`.
- **`this`**: Inside onclick, refers to the button element.

```javascript
const toggleFavorite = async (eventId, button) => {
    if (!isAuthenticated()) {
        showToast('Please login to add favorites', 'warning');
        window.location.href = '/login.html';
        return;
    }
```
- **Guard clause**: Check authentication before proceeding.
- **`window.location.href`**: Navigates to different page.

```javascript
    const isActive = button.classList.contains('active');

    try {
        if (isActive) {
            await api.removeFavorite(eventId);
            button.classList.remove('active');
            button.innerHTML = '<span class="material-symbols-outlined">favorite_border</span>';
```
- **Toggle logic**: If already favorited, remove. Otherwise, add.
- **`classList.remove/add`**: Manipulates CSS classes.
- **`innerHTML`**: Updates button icon.

---

## css/styles.css - Styling

CSS variables and component styles.

```css
:root {
    --primary: #6366F1;
    --secondary: #22D3EE;
    --background-dark: #121212;
```
- **`:root`**: Pseudo-class targeting document root. CSS variables defined here are global.
- **`--varname`**: CSS custom property (variable) syntax.
- **Color values**: Hexadecimal colors (#RRGGBB).

```css
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}
```
- **Universal selector `*`**: Targets all elements.
- **`::before/::after`**: Pseudo-elements.
- **`box-sizing: border-box`**: Width/height include padding and border. Essential for predictable layouts.
- **Reset margin/padding**: Removes browser defaults.

```css
.card:hover {
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow: var(--shadow-glow);
    transform: translateY(-4px);
}
```
- **`:hover`**: Styles applied when mouse is over element.
- **`rgba()`**: Color with alpha (transparency). 0.5 = 50% opacity.
- **`var(--shadow-glow)`**: References CSS variable.
- **`transform: translateY(-4px)`**: Moves element up 4 pixels (hover lift effect).

```css
.modal-overlay {
    opacity: 0;
    visibility: hidden;
    transition: all var(--transition-base);
}

.modal-overlay.active {
    opacity: 1;
    visibility: visible;
}
```
- **Modal pattern**: Hidden by default, shown when `.active` class added.
- **`visibility: hidden`**: Unlike `display: none`, element still takes space and can animate.
- **`transition`**: Animates changes smoothly.

```css
@media (min-width: 768px) {
    .md\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
}
```
- **`@media`**: Media query for responsive design.
- **`min-width: 768px`**: Applies when screen is 768px or wider.
- **`\:`**: Escaped colon in class name (like Tailwind's `md:grid-cols-2`).
- **`repeat(2, 1fr)`**: Two equal-width columns.

---

# Configuration Files

---

## .env.example - Environment Variables Template

```env
DB_HOST=localhost
```
- **DB_HOST**: Database server address. `localhost` for local, or remote server IP/domain.

```env
DB_USER=root
```
- **DB_USER**: MySQL username. `root` is default admin user.

```env
DB_PASSWORD=
```
- **DB_PASSWORD**: MySQL password. Empty for XAMPP default installation.

```env
DB_NAME=eventscraper_hub
```
- **DB_NAME**: Which database to use for this application.

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```
- **JWT_SECRET**: Secret key for signing tokens. **MUST be random and secret in production!**

```env
JWT_EXPIRES_IN=7d
```
- **JWT_EXPIRES_IN**: Token expiration time. `7d` = 7 days, `1h` = 1 hour, etc.

```env
N8N_WEBHOOK_URL=https://your-n8n-instance.app/webhook/scraping
```
- **N8N_WEBHOOK_URL**: URL of n8n webhook to trigger for scraping.

---

## vercel.json - Vercel Deployment Configuration

```json
{
  "version": 2,
```
- **version**: Vercel configuration version. Always use 2.

```json
  "builds": [
    {
      "src": "backend/server.js",
      "use": "@vercel/node"
    },
```
- **builds**: Defines how to build each part.
- **`@vercel/node`**: Uses Vercel's Node.js runtime for the backend.

```json
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/server.js"
    },
```
- **routes**: URL routing rules.
- **`/api/(.*)`**: Regex matching any path starting with `/api/`.
- **`dest`**: Where to send matching requests.

---

## database/schema.sql - Database Schema

```sql
CREATE DATABASE IF NOT EXISTS eventscraper_hub;
```
- **CREATE DATABASE**: Creates new database.
- **IF NOT EXISTS**: Prevents error if database already exists.

```sql
USE eventscraper_hub;
```
- **USE**: Selects this database for subsequent commands.

```sql
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
```
- **INT**: Integer data type.
- **PRIMARY KEY**: Unique identifier for each row.
- **AUTO_INCREMENT**: Automatically assigns incrementing IDs (1, 2, 3...).

```sql
    username VARCHAR(50) NOT NULL UNIQUE,
```
- **VARCHAR(50)**: Variable-length string, max 50 characters.
- **NOT NULL**: Cannot be empty.
- **UNIQUE**: No duplicate values allowed.

```sql
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
```
- **TIMESTAMP**: Date and time data type.
- **DEFAULT CURRENT_TIMESTAMP**: Automatically set to current time when row created.

```sql
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```
- **ON UPDATE CURRENT_TIMESTAMP**: Automatically updates when row is modified.

```sql
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
```
- **FOREIGN KEY**: Links to another table's primary key.
- **ON DELETE CASCADE**: When user is deleted, their events are also deleted.

```sql
    INDEX idx_status (status),
```
- **INDEX**: Creates database index for faster searches on this column.
- **`idx_status`**: Name of the index.

```sql
    UNIQUE KEY unique_favorite (user_id, event_id)
```
- **Composite unique key**: Combination of user_id + event_id must be unique. Prevents duplicate favorites.

---

# End of Documentation

This document covered every file in the EventScraper Hub project with line-by-line explanations. For questions or clarifications, refer to the official documentation of each technology used:

- [Express.js Documentation](https://expressjs.com/)
- [MySQL2 Documentation](https://github.com/sidorares/node-mysql2)
- [JWT Documentation](https://jwt.io/)
- [Joi Validation](https://joi.dev/)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
