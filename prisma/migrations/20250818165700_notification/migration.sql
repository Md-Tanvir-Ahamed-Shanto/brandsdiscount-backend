-- CreateEnum
CREATE TYPE "SellBy" AS ENUM ('EBAY1', 'EBAY2', 'EBAY3', 'WEBSITE', 'WALMART', 'SHEIN', 'WOOCOM', 'PHYSICAL');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "selledBy" "SellBy" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
