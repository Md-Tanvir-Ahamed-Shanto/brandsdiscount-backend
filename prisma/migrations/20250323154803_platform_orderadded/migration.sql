-- CreateTable
CREATE TABLE "WalmartOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "orderCreationDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalmartOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EbayOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "orderCreationDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EbayOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SheinOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "orderCreationDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SheinOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalmartOrder_orderId_key" ON "WalmartOrder"("orderId");

-- CreateIndex
CREATE INDEX "WalmartOrder_status_idx" ON "WalmartOrder"("status");

-- CreateIndex
CREATE INDEX "WalmartOrder_createdAt_idx" ON "WalmartOrder"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EbayOrder_orderId_key" ON "EbayOrder"("orderId");

-- CreateIndex
CREATE INDEX "EbayOrder_status_idx" ON "EbayOrder"("status");

-- CreateIndex
CREATE INDEX "EbayOrder_createdAt_idx" ON "EbayOrder"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SheinOrder_orderId_key" ON "SheinOrder"("orderId");

-- CreateIndex
CREATE INDEX "SheinOrder_status_idx" ON "SheinOrder"("status");

-- CreateIndex
CREATE INDEX "SheinOrder_createdAt_idx" ON "SheinOrder"("createdAt");
