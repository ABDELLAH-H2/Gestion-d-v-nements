# EventScraper Hub - Event Management System

## 🎯 Description

A full-stack Event Management System with automated scraping capabilities. Discover, create, and manage events like conferences, concerts, workshops, and meetups. Features include JWT authentication, favorites system, and n8n workflow integration for automated venue discovery.

## 🖼️ Screenshots

### Event Discovery Dashboard
Dark-themed dashboard with event cards, filtering by type (conferences, concerts, workshops, meetups), search functionality, and pagination.

### My Saved Events
Personal favorites page showing curated events with quick access to auto-scraping features.

### Automation Panel
Admin panel for triggering n8n workflows to scrape venue data from Google Maps and export to Google Sheets.

## 🛠️ Technologies

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Custom properties, Flexbox, Grid, animations
- **JavaScript (ES6+)** - Fetch API, async/await, DOM manipulation
- **Manrope Font** - Modern, clean typography
- **Material Symbols** - Google's icon library

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL2** - Database driver with promise support
- **JWT (jsonwebtoken)** - Secure authentication
- **bcryptjs** - Password hashing
- **Joi** - Request validation
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment configuration

### Database
- **MySQL** - Local development
- **Supabase (PostgreSQL)** - Production deployment

### Automation
- **n8n** - Workflow automation platform
- **Google Maps API** - Venue data scraping
- **Google Sheets** - Data export

### Deployment
- **Vercel** - Frontend and serverless backend hosting

## 📋 Features

- ✅ JWT Authentication (Register, Login, Session Management)
- ✅ Full CRUD Operations for Events
- ✅ Favorites System (Add/Remove/View)
- ✅ Search & Filter (by type, status, keyword)
- ✅ Pagination (6 events per page)
- ✅ n8n Workflow Integration for Scraping
- ✅ Google Sheets Export
- ✅ Dark Theme UI
- ✅ Responsive Design
- ✅ Toast Notifications
- ✅ Modal Forms

## 🚀 Installation

### Prerequisites
- Node.js v18+
- MySQL 8.0+
- npm or yarn

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=eventscraper_hub
# JWT_SECRET=your-super-secret-key

# Run database migrations
mysql -u root -p < database/schema.sql

# Start the server
npm run dev
```

### Frontend Setup

```bash
# Open frontend in browser
# Using VS Code Live Server or Python:
cd frontend
python -m http.server 5500

# Or with Node.js
npx serve frontend
```

## 📝 API Documentation

### Authentication

```
POST /api/auth/register
Body: { username, email, password }
Response: { success, token, user }

POST /api/auth/login
Body: { email, password }
Response: { success, token, user }

GET /api/auth/me
Headers: { Authorization: Bearer <token> }
Response: { success, user }
```

### Events

```
GET /api/events
Query: ?search=&type=&status=&page=1&limit=6
Response: { success, data, pagination }

GET /api/events/:id
Response: { success, data }

POST /api/events (protected)
Body: { name, type, description, date, location, capacity, price, status, image }
Response: { success, data }

PUT /api/events/:id (protected, owner only)
Body: { ...updated fields }
Response: { success, data }

DELETE /api/events/:id (protected, owner only)
Response: { success, message }
```

### Favorites

```
GET /api/favorites/my-favorites (protected)
Response: { success, data, pagination }

POST /api/favorites/:eventId (protected)
Response: { success, message }

DELETE /api/favorites/:eventId (protected)
Response: { success, message }
```

### Scraping

```
POST /api/scraping/trigger (protected)
Body: { city, keyword }
Response: { success, message, sheetUrl }
```

## 🌐 Live Demo

- **Frontend**: https://your-app.vercel.app
- **Backend API**: https://your-app.vercel.app/api

### Test Credentials
- Email: demo@example.com
- Password: password

## 📁 Project Structure

```
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── eventController.js
│   │   ├── favoriteController.js
│   │   └── scrapingController.js
│   ├── database/
│   │   └── schema.sql
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── events.js
│   │   ├── favorites.js
│   │   └── scraping.js
│   ├── validators/
│   │   └── validators.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── api.js
│   │   ├── automation.js
│   │   ├── events.js
│   │   └── favorites.js
│   ├── automation.html
│   ├── favorites.html
│   ├── index.html
│   ├── login.html
│   └── register.html
├── vercel.json
└── README.md
```

## 🔧 n8n Workflow Setup

1. Create a new n8n workflow
2. Add a **Webhook** trigger node (POST method)
3. Add **HTTP Request** node to query Google Maps/SerpAPI
4. Add **Google Sheets** node to append data
5. Add **Respond to Webhook** node with sheetUrl
6. Activate workflow and copy webhook URL
7. Set `N8N_WEBHOOK_URL` in `.env`

## 🚀 Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - DB_HOST
# - DB_USER
# - DB_PASSWORD
# - DB_NAME
# - JWT_SECRET
# - N8N_WEBHOOK_URL
```

### Supabase Database

1. Create project on supabase.com
2. Go to Database → SQL Editor
3. Run `backend/database/schema.sql`
4. Copy connection credentials to Vercel env vars

## 👤 Author

[Your Name]

## 📄 License

MIT License - feel free to use this project for learning and development.
