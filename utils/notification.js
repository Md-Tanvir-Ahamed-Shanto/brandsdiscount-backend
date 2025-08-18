const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


export const createNotification = async ({ title, message, location, selledBy }) => {
  if (!title || !message || !location || !selledBy) {
    throw new Error("All fields (title, message, location, selledBy) are required.");
  }

  const notification = await prisma.notification.create({
    data: { title, message, location, selledBy },
  });

  return notification;
};
