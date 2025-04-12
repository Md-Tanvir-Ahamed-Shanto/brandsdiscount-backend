/*
  Warnings:

  - You are about to drop the column `search_vector` on the `Product` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "product_search_vector_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "search_vector";
