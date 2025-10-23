-- CreateTable
CREATE TABLE "StripeSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentIntentId" TEXT,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "cartItems" TEXT NOT NULL,
    "appliedPoints" DOUBLE PRECISION DEFAULT 0,
    "shippingAddress" TEXT,
    "billingAddress" TEXT,
    "failureReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StripeSession_sessionId_key" ON "StripeSession"("sessionId");

-- CreateIndex
CREATE INDEX "StripeSession_sessionId_idx" ON "StripeSession"("sessionId");

-- CreateIndex
CREATE INDEX "StripeSession_userId_idx" ON "StripeSession"("userId");

-- CreateIndex
CREATE INDEX "StripeSession_status_idx" ON "StripeSession"("status");

-- CreateIndex
CREATE INDEX "StripeSession_createdAt_idx" ON "StripeSession"("createdAt");

-- AddForeignKey
ALTER TABLE "StripeSession" ADD CONSTRAINT "StripeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
