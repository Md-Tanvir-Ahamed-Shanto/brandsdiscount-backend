const { PrismaClient } = require("@prisma/client");

// Create Prisma client instance with connection timeout and retry configuration
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

module.exports = { prisma, executeWithRetry };
