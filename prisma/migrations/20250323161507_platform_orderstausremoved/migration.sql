/*
  Warnings:

  - You are about to drop the column `status` on the `WalmartOrder` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "WalmartOrder_createdAt_idx";

-- DropIndex
DROP INDEX "WalmartOrder_status_idx";

-- AlterTable
ALTER TABLE "WalmartOrder" DROP COLUMN "status";

-- CreateIndex
CREATE INDEX "WalmartOrder_orderId_idx" ON "WalmartOrder"("orderId");
