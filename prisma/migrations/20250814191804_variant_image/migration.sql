-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
