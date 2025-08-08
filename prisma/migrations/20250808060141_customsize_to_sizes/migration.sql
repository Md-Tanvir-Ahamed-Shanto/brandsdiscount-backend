/*
  Warnings:

  - You are about to drop the column `customSize` on the `ProductVariant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productId,color,sizeType,sizes]` on the table `ProductVariant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ProductVariant_productId_color_sizeType_customSize_key";

-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "customSize",
ADD COLUMN     "sizes" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_color_sizeType_sizes_key" ON "ProductVariant"("productId", "color", "sizeType", "sizes");
