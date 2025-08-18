import { Router } from 'express';

const router = Router();

// Health check endpoint for deployment verification
router.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version
  };

  res.status(200).json(healthCheck);
});

// Detailed health check with database connectivity
router.get('/health/detailed', async (req, res) => {
  try {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      checks: {
        database: 'pending',
        externalServices: 'pending'
      }
    };

    // Add database health check if database connection is available
    if (req.app.locals.db) {
      try {
        // Simple query to test database connectivity
        await req.app.locals.db.query('SELECT 1 as health_check');
        healthCheck.checks.database = 'OK';
      } catch (error) {
        healthCheck.checks.database = 'ERROR';
        healthCheck.status = 'DEGRADED';
      }
    } else {
      healthCheck.checks.database = 'NOT_AVAILABLE';
    }

    // Add external service checks
    try {
      // You can add checks for external APIs, Redis, etc. here
      healthCheck.checks.externalServices = 'OK';
    } catch (error) {
      healthCheck.checks.externalServices = 'ERROR';
      healthCheck.status = 'DEGRADED';
    }

    const statusCode = healthCheck.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Readiness probe for Kubernetes/container orchestration
router.get('/ready', (req, res) => {
  // Add any readiness checks here (e.g., database connections, external services)
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

// Liveness probe for Kubernetes/container orchestration
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router; 