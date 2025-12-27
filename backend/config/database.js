const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres',
    port: process.env.DB_PORT || 5432,
    max: 10, // connection limit
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Database connected successfully (PostgreSQL)');
        client.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = { pool, testConnection };
