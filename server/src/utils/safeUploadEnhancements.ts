/**
 * Safe Upload Enhancements
 * 
 * This file demonstrates how to safely implement new features
 * using feature flags without breaking existing functionality.
 */

import { isFeatureEnabled, withFeatureFlag, logFeatureUsage } from './featureFlags';

// Constants for validation
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['text/csv', 'application/csv'];
const ALLOWED_FILE_EXTENSIONS = ['.csv'];

/**
 * Safe file size validation
 * Uses feature flag to enable/disable without breaking existing code
 */
export function validateFileSize(fileSize: number): { valid: boolean; error?: string } {
  return withFeatureFlag(
    'ENABLE_FILE_SIZE_VALIDATION',
    // New code (feature flag enabled)
    () => {
      try {
        if (fileSize > MAX_FILE_SIZE_BYTES) {
          const sizeMB = Math.round(fileSize / 1024 / 1024);
          const maxMB = Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024);
          return {
            valid: false,
            error: `File size (${sizeMB}MB) exceeds maximum allowed size (${maxMB}MB)`
          };
        }
        
        logFeatureUsage('ENABLE_FILE_SIZE_VALIDATION', true);
        return { valid: true };
      } catch (error) {
        logFeatureUsage('ENABLE_FILE_SIZE_VALIDATION', false);
        console.error('File size validation failed:', error);
        return { valid: true }; // Fallback to allow file
      }
    },
    // Fallback code (feature flag disabled)
    () => {
      return { valid: true }; // No validation when disabled
    }
  );
}

/**
 * Safe file type validation
 * Uses feature flag to enable/disable without breaking existing code
 */
export function validateFileType(mimetype: string, filename: string): { valid: boolean; error?: string } {
  return withFeatureFlag(
    'ENABLE_FILE_TYPE_VALIDATION',
    // New code (feature flag enabled)
    () => {
      try {
        // Check MIME type
        if (!ALLOWED_FILE_TYPES.includes(mimetype)) {
          return {
            valid: false,
            error: `File type '${mimetype}' is not allowed. Only CSV files are supported.`
          };
        }

        // Check file extension
        const hasValidExtension = ALLOWED_FILE_EXTENSIONS.some(ext => 
          filename.toLowerCase().endsWith(ext)
        );
        
        if (!hasValidExtension) {
          return {
            valid: false,
            error: `File extension not allowed. Only .csv files are supported.`
          };
        }

        logFeatureUsage('ENABLE_FILE_TYPE_VALIDATION', true);
        return { valid: true };
      } catch (error) {
        logFeatureUsage('ENABLE_FILE_TYPE_VALIDATION', false);
        console.error('File type validation failed:', error);
        return { valid: true }; // Fallback to allow file
      }
    },
    // Fallback code (feature flag disabled)
    () => {
      return { valid: true }; // No validation when disabled
    }
  );
}

/**
 * Safe encoding detection
 * Uses feature flag to enable/disable without breaking existing code
 */
export function detectFileEncoding(buffer: Buffer): { encoding: string; confidence: number } {
  return withFeatureFlag(
    'ENABLE_ENCODING_DETECTION',
    // New code (feature flag enabled)
    () => {
      try {
        // Simple encoding detection logic
        const sample = buffer.slice(0, 1000).toString('binary');
        
        // Check for UTF-8 BOM
        if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
          logFeatureUsage('ENABLE_ENCODING_DETECTION', true);
          return { encoding: 'utf-8', confidence: 0.9 };
        }
        
        // Check for UTF-16 BOM
        if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
          logFeatureUsage('ENABLE_ENCODING_DETECTION', true);
          return { encoding: 'utf-16le', confidence: 0.9 };
        }
        
        // Default to UTF-8 for most cases
        logFeatureUsage('ENABLE_ENCODING_DETECTION', true);
        return { encoding: 'utf-8', confidence: 0.7 };
      } catch (error) {
        logFeatureUsage('ENABLE_ENCODING_DETECTION', false);
        console.error('Encoding detection failed:', error);
        return { encoding: 'utf-8', confidence: 0.5 }; // Safe fallback
      }
    },
    // Fallback code (feature flag disabled)
    () => {
      return { encoding: 'utf-8', confidence: 0.5 }; // Default encoding
    }
  );
}

/**
 * Comprehensive file validation
 * Combines all validation checks safely
 */
export function validateUploadFile(
  file: Express.Multer.File
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // File size validation
  const sizeValidation = validateFileSize(file.size);
  if (!sizeValidation.valid) {
    errors.push(sizeValidation.error!);
  }

  // File type validation
  const typeValidation = validateFileType(file.mimetype, file.originalname);
  if (!typeValidation.valid) {
    errors.push(typeValidation.error!);
  }

  // Encoding detection (warning only)
  const encodingInfo = detectFileEncoding(file.buffer);
  if (encodingInfo.confidence < 0.7) {
    warnings.push(`Low confidence in encoding detection (${encodingInfo.encoding}, confidence: ${encodingInfo.confidence})`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Log validation results for monitoring
 */
export function logValidationResults(
  filename: string,
  validation: { valid: boolean; errors: string[]; warnings: string[] }
): void {
  console.log(`[FILE_VALIDATION] ${filename}:`, {
    valid: validation.valid,
    errorCount: validation.errors.length,
    warningCount: validation.warnings.length,
    timestamp: new Date().toISOString()
  });

  if (validation.errors.length > 0) {
    console.error(`[FILE_VALIDATION_ERRORS] ${filename}:`, validation.errors);
  }

  if (validation.warnings.length > 0) {
    console.warn(`[FILE_VALIDATION_WARNINGS] ${filename}:`, validation.warnings);
  }
} 