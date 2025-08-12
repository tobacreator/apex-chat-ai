CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Updated businesses table for WhatsApp integration
CREATE TABLE businesses (
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

-- WhatsApp messages logging
CREATE TABLE whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR NOT NULL,
    message_text TEXT NOT NULL,
    direction VARCHAR NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    message_type VARCHAR DEFAULT 'text',
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales ledger for tracking all sales (online and in-store)
CREATE TABLE sales_ledger (
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

-- Customer conversations tracking
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    customer_phone VARCHAR NOT NULL,
    current_state VARCHAR NOT NULL DEFAULT 'initial',
    context JSONB DEFAULT '{}',
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation state tracking for onboarding flow
CREATE TABLE conversation_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR UNIQUE NOT NULL,
    state VARCHAR NOT NULL DEFAULT 'new_user',
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    sku VARCHAR NOT NULL,
    product_name VARCHAR NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    category VARCHAR,
    upload_id UUID REFERENCES file_uploads(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, sku)
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_whatsapp_id VARCHAR NOT NULL,
    order_number VARCHAR UNIQUE NOT NULL,
    order_status VARCHAR NOT NULL,
    total_amount NUMERIC(10, 2),
    order_date TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    filename VARCHAR NOT NULL,
    file_type VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'completed',
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_businesses_whatsapp_phone ON businesses(whatsapp_phone);
CREATE INDEX idx_whatsapp_messages_phone_number ON whatsapp_messages(phone_number);
CREATE INDEX idx_whatsapp_messages_business_id ON whatsapp_messages(business_id);
CREATE INDEX idx_sales_ledger_business_id ON sales_ledger(business_id);
CREATE INDEX idx_sales_ledger_created_at ON sales_ledger(created_at);
CREATE INDEX idx_conversations_business_id ON conversations(business_id);
CREATE INDEX idx_conversations_customer_phone ON conversations(customer_phone);
CREATE INDEX idx_conversation_states_phone_number ON conversation_states(phone_number);
CREATE INDEX idx_conversation_states_business_id ON conversation_states(business_id);
CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_products_product_name ON products(product_name);