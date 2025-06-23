-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_sizeId_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "sizes" TEXT;
