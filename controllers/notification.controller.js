const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ✅ Create Notification
const createNotification = async (req, res) => {
  try {
    const { title, message, location, selledBy } = req.body;

    if (!title || !message || !location || !selledBy) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const notification = await prisma.notification.create({
      data: { title, message, location, selledBy },
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create notification." });
  }
};

// ✅ Get All Notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(notifications);
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ error: "Failed to fetch notifications." });
  }
};

// ✅ Get Single Notification by ID
const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found." });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notification." });
  }
};

// ✅ Mark Notification as Read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update notification." });
  }
};

// mark as a all read

const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    res.json({ message: "All notifications marked as read." });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notifications." });
  }
};

// ✅ Delete Notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.notification.delete({ where: { id } });

    res.json({ message: "Notification deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete notification." });
  }
};

module.exports = {
  createNotification,
  getNotifications,
  getNotificationById,
  markAsRead,
  deleteNotification,
  markAllAsRead,
};
