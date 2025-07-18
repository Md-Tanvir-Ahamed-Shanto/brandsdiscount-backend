-- CreateTable
CREATE TABLE "WooComOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "orderCreationDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WooComOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WooComOrder_orderId_key" ON "WooComOrder"("orderId");

-- CreateIndex
CREATE INDEX "WooComOrder_createdAt_idx" ON "WooComOrder"("createdAt");
