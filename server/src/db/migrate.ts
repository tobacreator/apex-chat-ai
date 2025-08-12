import { query } from './index';

const createBusinessesTable = async () => {
  try {
    console.log('Creating businesses table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS businesses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_name VARCHAR NOT NULL,
        whatsapp_phone VARCHAR UNIQUE NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'active',
        api_key VARCHAR UNIQUE,
        google_access_token TEXT,
        google_refresh_token TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    await query(createTableSQL);
    console.log('✅ businesses table created successfully!');
    
  } catch (error: any) {
    console.error('❌ Error creating businesses table:', error.message);
    throw error;
  }
};

const createWhatsappMessagesTable = async () => {
  try {
    console.log('Creating whatsapp_messages table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number VARCHAR NOT NULL,
        message_text TEXT NOT NULL,
        direction VARCHAR NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
        message_type VARCHAR DEFAULT 'text',
        business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    await query(createTableSQL);
    console.log('✅ whatsapp_messages table created successfully!');
    
  } catch (error: any) {
    console.error('❌ Error creating whatsapp_messages table:', error.message);
    throw error;
  }
};

const createSalesLedgerTable = async () => {
  try {
    console.log('Creating sales_ledger table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS sales_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        product_name VARCHAR NOT NULL,
        quantity INTEGER NOT NULL,
        total_amount NUMERIC(10,2) NOT NULL,
        payment_method VARCHAR NOT NULL,
        sale_type VARCHAR NOT NULL CHECK (sale_type IN ('online', 'in-store')),
        customer_phone VARCHAR,
        order_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    await query(createTableSQL);
    console.log('✅ sales_ledger table created successfully!');
    
  } catch (error: any) {
    console.error('❌ Error creating sales_ledger table:', error.message);
    throw error;
  }
};

const createConversationsTable = async () => {
  try {
    console.log('Creating conversations table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
        customer_phone VARCHAR NOT NULL,
        current_state VARCHAR NOT NULL DEFAULT 'initial',
        context JSONB DEFAULT '{}',
        last_message_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    await query(createTableSQL);
    console.log('✅ conversations table created successfully!');
    
  } catch (error: any) {
    console.error('❌ Error creating conversations table:', error.message);
    throw error;
  }
};

const createConversationStatesTable = async () => {
  try {
    console.log('Creating conversation_states table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS conversation_states (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number VARCHAR UNIQUE NOT NULL,
        state VARCHAR NOT NULL DEFAULT 'new_user',
        business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
        metadata JSONB DEFAULT '{}',
        last_updated TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    await query(createTableSQL);
    console.log('✅ conversation_states table created successfully!');
    
  } catch (error: any) {
    console.error('❌ Error creating conversation_states table:', error.message);
    throw error;
  }
};

const createFaqsTable = async () => {
  try {
    console.log('Creating faqs table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS faqs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category VARCHAR,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    await query(createTableSQL);
    console.log('✅ faqs table created successfully!');
    
  } catch (error: any) {
    console.error('❌ Error creating faqs table:', error.message);
    throw error;
  }
};

const createProductsTable = async () => {
  try {
    console.log('Creating products table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        sku VARCHAR NOT NULL,
        product_name VARCHAR NOT NULL,
        description TEXT,
        price NUMERIC(10,2) NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        category VARCHAR,
        upload_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(business_id, sku)
      );
    `;
    
    await query(createTableSQL);
    console.log('✅ products table created successfully!');
    
  } catch (error: any) {
    console.error('❌ Error creating products table:', error.message);
    throw error;
  }
};

const createOrdersTable = async () => {
  try {
    console.log('Creating orders table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        customer_whatsapp_id VARCHAR NOT NULL,
        order_number VARCHAR UNIQUE NOT NULL,
        order_status VARCHAR NOT NULL,
        total_amount NUMERIC(10, 2),
        order_date TIMESTAMPTZ DEFAULT NOW(),
        last_updated TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    await query(createTableSQL);
    console.log('✅ orders table created successfully!');
    
  } catch (error: any) {
    console.error('❌ Error creating orders table:', error.message);
    throw error;
  }
};

const createFileUploadsTable = async () => {
  try {
    console.log('Creating file_uploads table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS file_uploads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        filename VARCHAR NOT NULL,
        file_type VARCHAR NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'completed',
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    await query(createTableSQL);
    console.log('✅ file_uploads table created successfully!');
    
  } catch (error: any) {
    console.error('❌ Error creating file_uploads table:', error.message);
    throw error;
  }
};

const createIndexes = async () => {
  try {
    console.log('Creating indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_businesses_whatsapp_phone ON businesses(whatsapp_phone);',
      'CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_number ON whatsapp_messages(phone_number);',
      'CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_business_id ON whatsapp_messages(business_id);',
      'CREATE INDEX IF NOT EXISTS idx_sales_ledger_business_id ON sales_ledger(business_id);',
      'CREATE INDEX IF NOT EXISTS idx_sales_ledger_created_at ON sales_ledger(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_conversations_business_id ON conversations(business_id);',
      'CREATE INDEX IF NOT EXISTS idx_conversations_customer_phone ON conversations(customer_phone);',
      'CREATE INDEX IF NOT EXISTS idx_conversation_states_phone_number ON conversation_states(phone_number);',
      'CREATE INDEX IF NOT EXISTS idx_conversation_states_business_id ON conversation_states(business_id);',
      'CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);',
      'CREATE INDEX IF NOT EXISTS idx_products_product_name ON products(product_name);'
    ];
    
    for (const indexSQL of indexes) {
      await query(indexSQL);
    }
    
    console.log('✅ All indexes created successfully!');
    
  } catch (error: any) {
    console.error('❌ Error creating indexes:', error.message);
    throw error;
  }
};

const runMigration = async () => {
  try {
    console.log('🚀 Starting database migration...');
    
    // Create tables in dependency order
    await createBusinessesTable();
    await createWhatsappMessagesTable();
    await createSalesLedgerTable();
    await createConversationsTable();
    await createConversationStatesTable();
    await createFaqsTable();
    await createProductsTable();
    await createOrdersTable();
    await createFileUploadsTable();
    
    // Create indexes - temporarily commented out to fix migration
    // await createIndexes();
    
    console.log('🎉 Migration completed successfully!');
    console.log('⚠️  Note: Indexes were skipped. Run them manually if needed.');
    process.exit(0);
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
};

// Run the migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

export { 
  createBusinessesTable,
  createWhatsappMessagesTable,
  createSalesLedgerTable,
  createConversationsTable,
  createConversationStatesTable,
  createFaqsTable,
  createProductsTable,
  createOrdersTable,
  createFileUploadsTable,
  createIndexes
}; 