/**
 * Feature Flag System for Safe Implementation
 * 
 * This system allows us to gradually roll out new features
 * and quickly disable them if issues arise.
 */

export interface FeatureFlags {
  // File Upload Enhancements
  ENABLE_FILE_SIZE_VALIDATION: boolean;
  ENABLE_FILE_TYPE_VALIDATION: boolean;
  ENABLE_ENCODING_DETECTION: boolean;
  
  // Google Sheets Enhancements
  ENABLE_OAUTH_REFRESH_HANDLING: boolean;
  ENABLE_RATE_LIMITING: boolean;
  ENABLE_LARGE_FILE_PAGINATION: boolean;
  
  // Database Enhancements
  ENABLE_TRANSACTION_WRAPPERS: boolean;
  ENABLE_CONNECTION_POOL_MANAGEMENT: boolean;
  
  // Validation Enhancements
  ENABLE_ENHANCED_PRICE_PARSING: boolean;
  ENABLE_DATA_SANITIZATION: boolean;
}

/**
 * Get feature flags from environment variables
 * Defaults to false (safe) for all new features
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    // File Upload Enhancements
    ENABLE_FILE_SIZE_VALIDATION: process.env.ENABLE_FILE_SIZE_VALIDATION === 'true',
    ENABLE_FILE_TYPE_VALIDATION: process.env.ENABLE_FILE_TYPE_VALIDATION === 'true',
    ENABLE_ENCODING_DETECTION: process.env.ENABLE_ENCODING_DETECTION === 'true',
    
    // Google Sheets Enhancements
    ENABLE_OAUTH_REFRESH_HANDLING: process.env.ENABLE_OAUTH_REFRESH_HANDLING === 'true',
    ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING === 'true',
    ENABLE_LARGE_FILE_PAGINATION: process.env.ENABLE_LARGE_FILE_PAGINATION === 'true',
    
    // Database Enhancements
    ENABLE_TRANSACTION_WRAPPERS: process.env.ENABLE_TRANSACTION_WRAPPERS === 'true',
    ENABLE_CONNECTION_POOL_MANAGEMENT: process.env.ENABLE_CONNECTION_POOL_MANAGEMENT === 'true',
    
    // Validation Enhancements
    ENABLE_ENHANCED_PRICE_PARSING: process.env.ENABLE_ENHANCED_PRICE_PARSING === 'true',
    ENABLE_DATA_SANITIZATION: process.env.ENABLE_DATA_SANITIZATION === 'true',
  };
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature];
}

/**
 * Safe wrapper for feature-flagged code
 * Executes new code if enabled, falls back to old code if disabled
 */
export function withFeatureFlag<T>(
  feature: keyof FeatureFlags,
  newCode: () => T,
  fallbackCode: () => T
): T {
  if (isFeatureEnabled(feature)) {
    try {
      return newCode();
    } catch (error) {
      console.warn(`Feature ${feature} failed, falling back to old code:`, error);
      return fallbackCode();
    }
  } else {
    return fallbackCode();
  }
}

/**
 * Log feature flag usage for monitoring
 */
export function logFeatureUsage(feature: keyof FeatureFlags, success: boolean) {
  console.log(`[FEATURE_FLAG] ${feature}: ${success ? 'SUCCESS' : 'FAILED'} - ${new Date().toISOString()}`);
}

/**
 * Get feature flag status for debugging
 */
export function getFeatureFlagStatus(): Record<string, boolean> {
  const flags = getFeatureFlags();
  return Object.entries(flags).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, boolean>);
} 