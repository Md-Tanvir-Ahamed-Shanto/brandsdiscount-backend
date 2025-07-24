/*
  Warnings:

  - You are about to drop the column `discountPercent` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `ebayId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `platFormPrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `postName` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sheinId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `wallmartId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `woocommerceId` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "discountPercent",
DROP COLUMN "ebayId",
DROP COLUMN "platFormPrice",
DROP COLUMN "postName",
DROP COLUMN "sheinId",
DROP COLUMN "wallmartId",
DROP COLUMN "woocommerceId",
ADD COLUMN     "ebayOne" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ebayThree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ebayTwo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "sizeType" TEXT NOT NULL,
    "customSize" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "skuSuffix" TEXT,
    "regularPrice" DOUBLE PRECISION NOT NULL,
    "salePrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "ProductVariant_skuSuffix_idx" ON "ProductVariant"("skuSuffix");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_color_sizeType_customSize_key" ON "ProductVariant"("productId", "color", "sizeType", "customSize");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
