const { pool } = require('../config/database');

const checkSchema = async () => {
    try {
        console.log('Checking users table schema...');
        
        const res = await pool.query(`
            SELECT column_name, is_nullable, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        
        console.log('Columns in users table:');
        const columns = res.rows;
        let hasGoogleId = false;
        let passwordNullable = false;

        columns.forEach(col => {
            console.log(`- ${col.column_name} (${col.data_type}, Nullable: ${col.is_nullable})`);
            if (col.column_name === 'google_id') hasGoogleId = true;
            if (col.column_name === 'password' && col.is_nullable === 'YES') passwordNullable = true;
        });

        console.log('\n--- Diagnostics ---');
        if (hasGoogleId) {
            console.log('✅ google_id column exists.');
        } else {
            console.log('❌ google_id column is MISSING.');
        }

        if (passwordNullable) {
            console.log('✅ password column allows NULL (Correct for Google Auth).');
        } else {
            console.log('❌ password column is NOT NULL (Will fail for Google Auth).');
        }

    } catch (error) {
        console.error('Check failed:', error);
    } finally {
        await pool.end();
    }
};

checkSchema();
