import { Router, Request, Response } from 'express';
import { query } from '../db';
import { getFeatureFlagStatus } from '../utils/featureFlags';

const router = Router();

/**
 * Basic health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await query('SELECT 1 as health_check');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Detailed health check for upload functionality
 */
router.get('/health/upload', async (req: Request, res: Response) => {
  try {
    const checks = {
      database: false,
      fileSystem: false,
      featureFlags: false,
      memory: false
    };

    // Test database connection
    try {
      await query('SELECT 1 as db_check');
      checks.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Test file system (if applicable)
    try {
      // Add file system checks here if needed
      checks.fileSystem = true;
    } catch (error) {
      console.error('File system health check failed:', error);
    }

    // Check feature flags
    try {
      const flags = getFeatureFlagStatus();
      checks.featureFlags = true;
    } catch (error) {
      console.error('Feature flags health check failed:', error);
    }

    // Check memory usage
    try {
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };
      
      // Consider unhealthy if memory usage is too high
      checks.memory = memUsageMB.heapUsed < 500; // Less than 500MB
    } catch (error) {
      console.error('Memory health check failed:', error);
    }

    const allHealthy = Object.values(checks).every(check => check === true);

    res.json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      featureFlags: getFeatureFlagStatus()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check for Google Sheets integration
 */
router.get('/health/google-sheets', async (req: Request, res: Response) => {
  try {
    const checks = {
      environment: false,
      database: false,
      featureFlags: false
    };

    // Check environment variables
    try {
      const requiredEnvVars = [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'GOOGLE_REDIRECT_URI'
      ];
      
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      checks.environment = missingVars.length === 0;
      
      if (!checks.environment) {
        console.error('Missing Google Sheets environment variables:', missingVars);
      }
    } catch (error) {
      console.error('Environment health check failed:', error);
    }

    // Test database connection
    try {
      await query('SELECT 1 as db_check');
      checks.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Check feature flags
    try {
      const flags = getFeatureFlagStatus();
      checks.featureFlags = true;
    } catch (error) {
      console.error('Feature flags health check failed:', error);
    }

    const allHealthy = Object.values(checks).every(check => check === true);

    res.json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      featureFlags: getFeatureFlagStatus()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Feature flag status endpoint
 */
router.get('/health/feature-flags', (req: Request, res: Response) => {
  try {
    res.json({
      timestamp: new Date().toISOString(),
      featureFlags: getFeatureFlagStatus()
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 