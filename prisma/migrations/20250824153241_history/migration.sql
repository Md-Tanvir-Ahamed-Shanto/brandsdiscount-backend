-- CreateTable
CREATE TABLE "ProductChangeHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "oldItemLocation" TEXT,
    "newItemLocation" TEXT,
    "oldNotes" TEXT,
    "newNotes" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductChangeHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProductChangeHistory" ADD CONSTRAINT "ProductChangeHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
