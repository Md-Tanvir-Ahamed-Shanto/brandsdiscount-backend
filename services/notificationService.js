const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

export const createNotificationService = async ({ title, message, location, selledBy }) => {
  if (!title || !message || !location || !selledBy) {
    throw new Error("All fields are required.");
  }

  const notification = await prisma.notification.create({
    data: { title, message, location, selledBy },
  });

  return notification;
};