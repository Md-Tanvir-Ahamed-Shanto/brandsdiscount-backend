const fs = require('fs');
const path = require('path');
const { prisma, executeWithRetry } = require('../db/connection');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Logger for synchronization operations
 */
class SyncLogger {
  constructor() {
    this.logFilePath = path.join(logsDir, 'sync_logs.json');
    this.ensureLogFileExists();
  }

  /**
   * Ensure log file exists
   */
  ensureLogFileExists() {
    if (!fs.existsSync(this.logFilePath)) {
      fs.writeFileSync(this.logFilePath, JSON.stringify([], null, 2));
    }
  }

  /**
   * Log a synchronization event
   * @param {string} platform - Platform name (eBay, Walmart, etc.)
   * @param {string} operation - Operation type (orderSync, tokenRefresh, etc.)
   * @param {string} status - Status (success, error)
   * @param {string} message - Log message
   * @param {object} details - Additional details (optional)
   */
  async log(platform, operation, status, message, details = {}) {
    console.log(`[${platform}][${operation}][${status}] ${message}`);
    const timestamp = new Date();
    const logEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      timestamp,
      platform,
      operation,
      status,
      message,
      details
    };

    // Save to database with enhanced retry mechanism
    try {
      await executeWithRetry(async () => {
        // First check if we can connect to the database
        try {
          await prisma.$queryRaw`SELECT 1`;
        } catch (connectionError) {
          // If connection fails, try to reconnect
          await prisma.$connect();
        }
        
        // Then create the log entry
        return prisma.syncLog.create({
          data: logEntry
        });
      }, 5, 1000); // 5 retries, 1 second initial delay with exponential backoff
    } catch (error) {
      console.error('Failed to save log to database after multiple retries:', error);
      
      // Always save to file as backup, even if database succeeds
      try {
        const logs = this.readLogs();
        logs.push(logEntry);
        
        // Keep only the last 1000 logs to prevent file from growing too large
        const trimmedLogs = logs.slice(-1000);
        fs.writeFileSync(this.logFilePath, JSON.stringify(trimmedLogs, null, 2));
      } catch (fileError) {
        console.error('Failed to write to log file:', fileError);
      }
    }

    // Also log to console for immediate visibility
    const logPrefix = `[${platform}][${operation}][${status}]`;
    if (status === 'error') {
      console.error(`${logPrefix} ${message}`, details);
    } else {
      console.log(`${logPrefix} ${message}`);
    }
  }

  /**
   * Read logs from file
   * @returns {Array} Array of log entries
   */
  readLogs() {
    try {
      const data = fs.readFileSync(this.logFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading logs file:', error);
      return [];
    }
  }

  /**
   * Get logs from database with filtering options
   * @param {object} filters - Filter options
   * @returns {Array} Array of log entries
   */
  async getLogs(filters = {}) {
    const { platform, operation, status, startDate, endDate, limit = 100, page = 1 } = filters;
    const where = {};
    
    if (platform) where.platform = platform;
    if (operation) where.operation = operation;
    if (status) where.status = status;
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    try {
      // First check database connection
      try {
        await executeWithRetry(() => prisma.$queryRaw`SELECT 1`, 3, 500);
      } catch (connectionError) {
        console.warn('Database connection check failed, attempting reconnect:', connectionError.message);
        await executeWithRetry(() => prisma.$connect(), 3, 1000);
      }
      
      // Use executeWithRetry for database operations with more retries
      const logs = await executeWithRetry(() => 
        prisma.syncLog.findMany({
          where,
          orderBy: {
            timestamp: 'desc'
          },
          skip: (page - 1) * limit,
          take: limit
        })
      , 5, 1000);

      const total = await executeWithRetry(() => 
        prisma.syncLog.count({ where })
      , 5, 1000);

      return {
        logs,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching logs from database after multiple retries:', error);
      
      // Fallback to file-based logs if database query fails
      const fileLogs = this.readLogs();
      return {
        logs: fileLogs,
        pagination: {
          total: fileLogs.length,
          page: 1,
          limit: fileLogs.length,
          pages: 1
        }
      };
    }
  }
}

module.exports = new SyncLogger();