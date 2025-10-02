const express = require('express');
const router = express.Router();
const syncLogController = require('../controllers/syncLog.controller');

// Get sync logs with filtering
router.get('/', syncLogController.getLogs);

// Get only error logs
router.get('/errors', syncLogController.getErrorLogs);

// Check if orders have been synced
router.get('/check-order-sync', syncLogController.checkOrderSync);

// Get successfully synced orders
router.get('/successful-orders', syncLogController.getSuccessfulOrderSyncs);

// Download sync logs as JSON file
router.get('/download', syncLogController.downloadLogs);

router.get('/cleanup', syncLogController.cleanupOldLogs);

module.exports = router;