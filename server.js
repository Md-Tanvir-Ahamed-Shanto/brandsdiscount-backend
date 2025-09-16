#!/usr/bin/env node

/**
 * Module dependencies.
 */

  const { prisma, executeWithRetry } = require('./db/connection');

let app = require("./app");
let debug = require("debug")("men-stack:server");
let http = require("http");

/**
 * Get port from environment and store in Express.
 */

let port = normalizePort(process.env.PORT || "5000");
app.set("port", port);

/**
 * Create HTTP server.
 */

let server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on("error", onError);
server.on("listening", onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  let port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

async function onError(error) {
  await prisma.$disconnect();
  if (error.syscall !== "listen") {
    throw error;
  }

  let bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  console.log(`Server is running on port http://localhost:${port}`);
  
  // Use executeWithRetry for more resilient database connection

  
  executeWithRetry(() => prisma.$connect(), 5, 2000)
    .then(() => {
      console.log("✅ Prisma is connected to the database with retry mechanism enabled");
    })
    .catch((err) => {
      console.error("❌ Failed to connect to the database after multiple retries:", err);
      console.error("Server will continue running, but database operations may fail");
      // Not exiting process to allow for potential recovery when DB comes back online
    });
    
  // Add graceful shutdown handler for database
  process.on('SIGINT', async () => {
    console.log('Received SIGINT signal. Closing database connections...');
    await prisma.$disconnect();
    console.log('Database connections closed. Exiting process.');
    process.exit(0);
  });
  
  let addr = server.address();
  let bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
}
