const { PrismaClient } = require("@prisma/client");

// Create Prisma client instance with logging for debugging connection issues
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Add logging for debugging connection issues
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Listen to database error events
prisma.$on('error', (e) => {
  console.error('Prisma Client Error:', e);
});

// Listen to query events (optional, for debugging)
prisma.$on('query', (e) => {
  // console.log('Query:', e);
});

// Wrapper function with retry functionality
async function executeWithRetry(operation, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if it is a connection error
      const isConnectionError = 
        error.message.includes('Connection') || 
        error.message.includes('timeout') ||
        error.message.includes('ECONNREFUSED') ||
        error.code === 'P1001' || // Cannot connect to the database
        error.code === 'P1002';   // Database server timeout
      
      if (!isConnectionError || attempt === maxRetries) {
        throw error;
      }
      
      console.warn(`Database operation failed, retrying ${attempt}/${maxRetries}:`, error.message);
      
      // Wait some time before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
}

// Extend prisma object, add transaction method with retry functionality
const originalTransaction = prisma.$transaction;
prisma.$transaction = async function(operations, options) {
  return executeWithRetry(() => originalTransaction.call(prisma, operations, {
    timeout: 30000, // 30 seconds timeout
    ...options
  }));
};

// Setup a better keepalive mechanism for serverless databases like Neon
// Instead of a fixed interval, we'll use a more intelligent approach
let keepAliveTimeout;
let isConnected = false;
const KEEPALIVE_INTERVAL = 20000; // 20 seconds
const MAX_IDLE_TIME = 25000; // 25 seconds (slightly longer than the interval)
let lastQueryTime = Date.now();

// Track query execution to reset the keepalive timer
prisma.$on('query', () => {
  lastQueryTime = Date.now();
  isConnected = true;
  resetKeepAliveTimer();
});

// Track connection errors
prisma.$on('error', (e) => {
  console.error('Prisma Client Error:', e);
  isConnected = false;
  // Attempt reconnection on next keepalive
  resetKeepAliveTimer(1000); // Try reconnecting sooner (1 second)
});

function resetKeepAliveTimer(delay = KEEPALIVE_INTERVAL) {
  if (keepAliveTimeout) {
    clearTimeout(keepAliveTimeout);
  }
  
  keepAliveTimeout = setTimeout(checkConnection, delay);
}

async function checkConnection() {
  const currentTime = Date.now();
  const idleTime = currentTime - lastQueryTime;
  
  // Only ping if we've been idle for a while but not too long
  if (idleTime > KEEPALIVE_INTERVAL && idleTime < MAX_IDLE_TIME) {
    try {
      // Simple query to keep the connection alive
      await executeWithRetry(() => prisma.$queryRaw`SELECT 1`);
      isConnected = true;
      console.log("Database keepalive ping successful");
    } catch (error) {
      console.error("Database keepalive ping failed:", error);
      isConnected = false;
      
      // Try to reconnect
      try {
        await executeWithRetry(() => prisma.$connect(), 3, 1000);
        console.log("Database reconnection successful");
        isConnected = true;
      } catch (reconnectError) {
        console.error("Database reconnection failed:", reconnectError);
      }
    }
  }
  
  // Schedule next check
  resetKeepAliveTimer();
}

// Start the keepalive mechanism
resetKeepAliveTimer();

// Handle process termination
process.on('SIGTERM', async () => {
  if (keepAliveTimeout) clearTimeout(keepAliveTimeout);
  await prisma.$disconnect();
  process.exit(0);
});

// Also handle SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  if (keepAliveTimeout) clearTimeout(keepAliveTimeout);
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = { prisma, executeWithRetry, resetKeepAliveTimer };
