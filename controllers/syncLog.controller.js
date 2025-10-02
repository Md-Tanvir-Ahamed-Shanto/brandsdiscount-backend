const syncLogger = require('../utils/syncLogger');
const { prisma, executeWithRetry } = require('../db/connection');

/**
 * Auto-delete old log data (older than specified days)
 */
exports.cleanupOldLogs = async (req, res) => {
    try {
    const { days = 2 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    
    const result = await executeWithRetry(() => prisma.syncLog.deleteMany({
      where: {
        timestamp: {
          lt: daysAgo
        }
      }
    }));
    
    res.json({
      success: true,
      message: `Successfully deleted ${result.count} logs older than ${days} days`,
      deletedCount: result.count
    });
  } catch (error) {
    console.error('Error cleaning up old logs:', error);
    res.status(500).json({ error: 'Failed to clean up old logs' });
  }
};

/**
 * Get sync logs with filtering options
 */
exports.getLogs = async (req, res) => {
  try {
    const { platform, operation, status, startDate, endDate, limit, page } = req.query;
    
    const logs = await syncLogger.getLogs({
      platform,
      operation,
      status,
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 100,
      page: page ? parseInt(page) : 1
    });
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({ error: 'Failed to fetch sync logs' });
  }
};

/**
 * Get only error logs
 */
exports.getErrorLogs = async (req, res) => {
  try {
    const { platform, operation, startDate, endDate, limit, page } = req.query;
    
    const logs = await syncLogger.getLogs({
      platform,
      operation,
      status: 'error', // Only get error logs
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 100,
      page: page ? parseInt(page) : 1
    });
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching error logs:', error);
    res.status(500).json({ error: 'Failed to fetch error logs' });
  }
};

/**
 * Check if any orders have been synced
 */
exports.checkOrderSync = async (req, res) => {
  try {
    const { platform, startDate, endDate } = req.query;
    
    const logs = await syncLogger.getLogs({
      platform,
      operation: 'orderSync',
      startDate,
      endDate,
      limit: 5
    });
    
    const hasOrderSync = logs.logs.length > 0;
    
    res.json({
      hasOrderSync,
      lastSync: hasOrderSync ? logs.logs : []
    });
  } catch (error) {
    console.error('Error checking order sync:', error);
    res.status(500).json({ error: 'Failed to check order sync status' });
  }
};

/**
 * Get successfully synced orders
 */
exports.getSuccessfulOrderSyncs = async (req, res) => {
  try {
    const { platform, startDate, endDate, limit, page } = req.query;
    
    const logs = await syncLogger.getLogs({
      platform,
      operation: 'orderSync',
      status: 'success',
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 100,
      page: page ? parseInt(page) : 1
    });
    
    // Extract order details from the logs
    const successfulOrders = logs.logs.map(log => {
      return {
        id: log.id,
        timestamp: log.timestamp,
        platform: log.platform,
        orderId: log.details.orderId || 'Unknown',
        orderDetails: log.details
      };
    });
    
    res.json({
      total: logs.total,
      page: logs.page,
      limit: logs.limit,
      orders: successfulOrders
    });
  } catch (error) {
    console.error('Error fetching successful order syncs:', error);
    res.status(500).json({ error: 'Failed to fetch successful order syncs' });
  }
};

/**
 * Download sync logs as JSON file
 */
exports.downloadLogs = async (req, res) => {
  try {
    const { platform, operation, status, startDate, endDate } = req.query;
    
    // Get all logs without pagination for download
    const { logs } = await syncLogger.getLogs({
      platform,
      operation,
      status,
      startDate,
      endDate,
      limit: 1000 // Limit to 1000 logs for download
    });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=sync_logs_${new Date().toISOString().split('T')[0]}.json`);
    
    // Send logs as JSON file
    res.json(logs);
  } catch (error) {
    console.error('Error downloading sync logs:', error);
    res.status(500).json({ error: 'Failed to download sync logs' });
  }
};

/**
 * Schedule automatic cleanup of old logs
 * This function will run every 2 days to clean up logs older than 2 days
 */
const scheduleLogCleanup = () => {
  // Run cleanup every 2 days (172800000 ms = 48 hours)
  setInterval(async () => {
    try {
      const daysToKeep = 2; // Keep logs for 2 days by default
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - daysToKeep);
      
      const result = await executeWithRetry(() => prisma.syncLog.deleteMany({
        where: {
          timestamp: {
            lt: daysAgo
          }
        }
      }));
      
      console.log(`[Scheduled Cleanup] Deleted ${result.count} logs older than ${daysToKeep} days`);
    } catch (error) {
      console.error('[Scheduled Cleanup] Error cleaning up old logs:', error);
    }
  }, 172800000); // Run every 48 hours (2 days)
};

// Start the scheduled cleanup when the controller is loaded
scheduleLogCleanup();