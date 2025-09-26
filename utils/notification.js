const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Creates a notification in the database
 * @param {Object} params - Notification parameters
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} params.location - Location identifier
 * @param {string} params.selledBy - Must be one of the SellBy enum values: EBAY1, EBAY2, EBAY3, WEBSITE, WALMART, WALMART2, SHEIN, WOOCOM, PHYSICAL
 * @returns {Promise<Object>} The created notification
 */
const createNotification = async ({ title, message, location, selledBy }) => {
  // Validate required fields
  if (!title || !message || !location || !selledBy) {
    throw new Error(
      "All fields (title, message, location, selledBy) are required."
    );
  }

  // Validate selledBy is a valid enum value
  const validSelledByValues = [
    "EBAY1",
    "EBAY2",
    "EBAY3",
    "WEBSITE",
    "WALMART",
    "WALMART2",
    "SHEIN",
    "WOOCOM",
    "PHYSICAL",
  ];
  if (!validSelledByValues.includes(selledBy)) {
    throw new Error(
      `Invalid selledBy value: ${selledBy}. Must be one of: ${validSelledByValues.join(
        ", "
      )}`
    );
  }

  try {
    const notification = await prisma.notification.create({
      data: { title, message, location, selledBy },
    });

    return notification;
  } catch (error) {
    console.error(`Failed to create notification: ${error.message}`);
    throw new Error(`Notification creation failed: ${error.message}`);
  }
};

module.exports = {
  createNotification,
};
