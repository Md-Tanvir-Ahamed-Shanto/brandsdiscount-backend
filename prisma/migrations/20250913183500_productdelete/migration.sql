-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OrderDetail" DROP CONSTRAINT "OrderDetail_orderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OrderDetail" DROP CONSTRAINT "OrderDetail_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductChangeHistory" DROP CONSTRAINT "ProductChangeHistory_productId_fkey";

-- AddForeignKey
ALTER TABLE "public"."ProductChangeHistory" ADD CONSTRAINT "ProductChangeHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderDetail" ADD CONSTRAINT "OrderDetail_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderDetail" ADD CONSTRAINT "OrderDetail_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
