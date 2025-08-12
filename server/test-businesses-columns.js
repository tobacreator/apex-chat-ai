require('dotenv').config();
const { query } = require('./src/db');

async function checkBusinessesColumns() {
    try {
        console.log('🔍 Checking businesses table columns...\n');
        
        // Check if businesses table exists
        const tableExists = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'businesses'
        `);
        
        if (tableExists.rows.length === 0) {
            console.log('❌ businesses table does not exist!');
            return;
        }
        
        console.log('✅ businesses table exists');
        
        // Check columns in businesses table
        const columns = await query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'businesses' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Columns in businesses table:');
        columns.rows.forEach((row, index) => {
            console.log(`  ${index + 1}. ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
        });
        
        // Check if whatsapp_phone column exists
        const whatsappPhoneExists = columns.rows.find(col => col.column_name === 'whatsapp_phone');
        if (whatsappPhoneExists) {
            console.log('\n✅ whatsapp_phone column exists');
        } else {
            console.log('\n❌ whatsapp_phone column does not exist!');
            console.log('Available columns:', columns.rows.map(col => col.column_name).join(', '));
        }
        
    } catch (error) {
        console.error('❌ Error checking businesses table:', error.message);
    } finally {
        process.exit(0);
    }
}

checkBusinessesColumns(); 