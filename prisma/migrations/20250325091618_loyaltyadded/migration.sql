/*
  Warnings:

  - Added the required column `sku` to the `OrderDetail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `TransactionId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Loyalty" AS ENUM ('Not_Eligible', 'Eligible', 'Loyal');

-- AlterTable
ALTER TABLE "OrderDetail" ADD COLUMN     "sku" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "parentCategoryId" TEXT,
ADD COLUMN     "platFormPrice" DOUBLE PRECISION,
ADD COLUMN     "subCategoryId" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "TransactionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "loyaltyStatus" "Loyalty" DEFAULT 'Not_Eligible',
ADD COLUMN     "orderPoint" DOUBLE PRECISION DEFAULT 0.00;

-- CreateIndex
CREATE INDEX "Product_subCategoryId_idx" ON "Product"("subCategoryId");

-- CreateIndex
CREATE INDEX "Product_parentCategoryId_idx" ON "Product"("parentCategoryId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
