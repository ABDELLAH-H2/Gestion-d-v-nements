const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../config/database');

const runMigration = async () => {
    try {
        console.log('Starting schema update...');
        
        // Add google_id column if it doesn't exist
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'google_id') THEN
                    ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
                END IF;
            END $$;
        `);
        console.log('Added google_id column.');

        // Make password nullable
        await pool.query('ALTER TABLE users ALTER COLUMN password DROP NOT NULL;');
        console.log('Made password nullable.');

        console.log('Schema update complete.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
};

runMigration();