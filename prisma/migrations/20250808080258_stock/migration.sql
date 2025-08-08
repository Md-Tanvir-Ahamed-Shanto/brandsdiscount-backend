/*
  Warnings:

  - You are about to drop the column `quantity` on the `ProductVariant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "quantity",
ADD COLUMN     "stockQuantity" INTEGER NOT NULL DEFAULT 0;
