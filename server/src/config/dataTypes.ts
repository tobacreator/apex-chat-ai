export interface DataTypeConfig {
  name: string;
  table: string;
  requiredFields: string[];
  optionalFields: string[];
  templateHeaders: string[];
  exampleData: string[];
  validationRules: {
    [field: string]: {
      type: 'string' | 'number' | 'integer' | 'date' | 'email';
      required?: boolean;
      min?: number;
      max?: number;
      pattern?: string;
    };
  };
}

export const DATA_TYPES: { [key: string]: DataTypeConfig } = {
  products: {
    name: 'Products',
    table: 'products',
    requiredFields: ['sku', 'product_name', 'price', 'stock_quantity'],
    optionalFields: ['description', 'category'],
    templateHeaders: ['sku', 'product_name', 'description', 'price', 'stock_quantity', 'category'],
    exampleData: ['PROD001', 'Sample Product 1', 'This is a sample product description', '19.99', '100', 'Electronics'],
    validationRules: {
      sku: { type: 'string', required: true },
      product_name: { type: 'string', required: true },
      description: { type: 'string', required: false },
      price: { type: 'number', required: true, min: 0 },
      stock_quantity: { type: 'integer', required: true, min: 0 },
      category: { type: 'string', required: false }
    }
  },
  orders: {
    name: 'Orders',
    table: 'orders',
    requiredFields: ['customer_whatsapp_id', 'order_number', 'order_status', 'total_amount'],
    optionalFields: [],
    templateHeaders: ['customer_whatsapp_id', 'order_number', 'order_status', 'total_amount'],
    exampleData: ['+1234567890', 'ORD001', 'pending', '99.99'],
    validationRules: {
      customer_whatsapp_id: { type: 'string', required: true },
      order_number: { type: 'string', required: true },
      order_status: { type: 'string', required: true },
      total_amount: { type: 'number', required: true, min: 0 }
    }
  }
};

export const getDataTypeConfig = (dataType: string): DataTypeConfig | null => {
  return DATA_TYPES[dataType] || null;
};

export const getAvailableDataTypes = (): string[] => {
  return Object.keys(DATA_TYPES);
}; 