import { DataTypeConfig } from '../config/dataTypes';

export interface ValidationError {
  row: number;
  field: string;
  error: string;
}

export const validateRow = (row: any, dataTypeConfig: DataTypeConfig, rowNumber: number): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  // Validate required fields
  for (const field of dataTypeConfig.requiredFields) {
    const value = row[field];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push({
        row: rowNumber,
        field,
        error: `${field} is required`
      });
    }
  }
  
  // Validate field types and constraints
  for (const [field, rule] of Object.entries(dataTypeConfig.validationRules)) {
    const value = row[field];
    
    // Skip validation if field is empty and not required
    if (!value && !rule.required) continue;
    
    if (value) {
      // Type validation
      switch (rule.type) {
        case 'number':
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            errors.push({
              row: rowNumber,
              field,
              error: `${field} must be a valid number`
            });
          } else {
            if (rule.min !== undefined && numValue < rule.min) {
              errors.push({
                row: rowNumber,
                field,
                error: `${field} must be at least ${rule.min}`
              });
            }
            if (rule.max !== undefined && numValue > rule.max) {
              errors.push({
                row: rowNumber,
                field,
                error: `${field} must be at most ${rule.max}`
              });
            }
          }
          break;
          
        case 'integer':
          const intValue = parseInt(value, 10);
          if (isNaN(intValue)) {
            errors.push({
              row: rowNumber,
              field,
              error: `${field} must be a valid integer`
            });
          } else {
            if (rule.min !== undefined && intValue < rule.min) {
              errors.push({
                row: rowNumber,
                field,
                error: `${field} must be at least ${rule.min}`
              });
            }
            if (rule.max !== undefined && intValue > rule.max) {
              errors.push({
                row: rowNumber,
                field,
                error: `${field} must be at most ${rule.max}`
              });
            }
          }
          break;
          
        case 'email':
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailPattern.test(value)) {
            errors.push({
              row: rowNumber,
              field,
              error: `${field} must be a valid email address`
            });
          }
          break;
          
        case 'date':
          const dateValue = new Date(value);
          if (isNaN(dateValue.getTime())) {
            errors.push({
              row: rowNumber,
              field,
              error: `${field} must be a valid date`
            });
          }
          break;
      }
      
      // Pattern validation
      if (rule.pattern) {
        const regex = new RegExp(rule.pattern);
        if (!regex.test(value)) {
          errors.push({
            row: rowNumber,
            field,
            error: `${field} format is invalid`
          });
        }
      }
    }
  }
  
  return errors;
};

export const validateBulkData = (rows: any[], dataTypeConfig: DataTypeConfig): ValidationError[] => {
  const allErrors: ValidationError[] = [];
  
  rows.forEach((row, index) => {
    const rowErrors = validateRow(row, dataTypeConfig, index + 1);
    allErrors.push(...rowErrors);
  });
  
  return allErrors;
}; 