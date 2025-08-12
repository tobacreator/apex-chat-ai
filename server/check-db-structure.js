require('dotenv').config();
const { query } = require('./src/db');

async function checkDatabaseStructure() {
    try {
        console.log('🔍 Checking database structure...\n');
        
        // Check businesses table
        console.log('📋 Businesses table columns:');
        const businessesColumns = await query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'businesses' 
            ORDER BY ordinal_position
        `);
        
        businessesColumns.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
        });
        
        console.log('\n📋 All tables:');
        const tables = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        tables.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkDatabaseStructure(); 