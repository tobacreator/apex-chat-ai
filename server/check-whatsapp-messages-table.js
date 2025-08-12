require('dotenv').config();
const { query } = require('./src/db');

async function checkWhatsappMessagesTable() {
    try {
        console.log('🔍 Checking whatsapp_messages table columns...\n');
        
        // Check if whatsapp_messages table exists
        const tableExists = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'whatsapp_messages'
        `);
        
        if (tableExists.rows.length === 0) {
            console.log('❌ whatsapp_messages table does not exist!');
            return;
        }
        
        console.log('✅ whatsapp_messages table exists');
        
        // Check columns in whatsapp_messages table
        const columns = await query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'whatsapp_messages' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Columns in whatsapp_messages table:');
        columns.rows.forEach((row, index) => {
            console.log(`  ${index + 1}. ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
        });
        
    } catch (error) {
        console.error('❌ Error checking whatsapp_messages table:', error.message);
    } finally {
        process.exit(0);
    }
}

checkWhatsappMessagesTable(); 