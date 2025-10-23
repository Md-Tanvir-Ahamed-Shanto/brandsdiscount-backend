const express = require("express");
const router = express.Router();
const {
  createNotification,
  getNotifications,
  getNotificationById,
  markAsRead,
  deleteNotification,
  markAllAsRead,
} = require("../controllers/notification.controller");

// Routes
router.post("/", createNotification);       // Create notification
router.get("/", getNotifications);          // Get all notifications
router.get("/:id", getNotificationById);    // Get single notification
router.patch("/:id/read", markAsRead);      // Mark notification as read
router.patch("/allread", markAllAsRead);    // Mark all notifications as read
router.delete("/:id", deleteNotification);  // Delete notification

module.exports = router;
