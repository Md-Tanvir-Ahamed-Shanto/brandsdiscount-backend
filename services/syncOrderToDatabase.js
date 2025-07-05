import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function syncOrderToDatabase(orderInput) {
  const {
    transactionId,
    items,
    status = "Pending",
    userId = "guest-user-id",
  } = orderInput;

  // Step 1: Check if already synced
  const exists = await prisma.order.findFirst({
    where: { transactionId },
  });
  if (exists) {
    console.log(`🟡 Order already exists: ${transactionId}`);
    return;
  }

  const orderDetails = [];
  let totalAmount = 0;

  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { sku: item.sku },
    });

    if (!product) {
      console.warn(`❌ SKU not found: ${item.sku}`);
      continue;
    }

    const price = product.salePrice ?? product.regularPrice ?? 0;
    const total = price * item.quantity;
    totalAmount += total;

    orderDetails.push({
      sku: item.sku,
      quantity: item.quantity,
      price,
      total,
      productId: product.id,
      productName: product.title,
      categoryName: "Imported", // or product.category?.name if you want
      sizeName: product.sizes ?? "N/A",
    });
  }

  if (orderDetails.length === 0) {
    console.warn("⚠️ No valid items in order.");
    return;
  }

  // Step 2: Save to DB
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId,
        status,
        totalAmount,
        transactionId,
        orderDetails: {
          create: orderDetails,
        },
      },
    });

    for (const item of orderDetails) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    await tx.transaction.create({
      data: {
        transactionId,
        orderId: order.id,
        amount: totalAmount,
        status: "Successful",
      },
    });
  });

  console.log(
    `✅ Synced order ${transactionId} with ${orderDetails.length} items.`
  );
}

await syncOrderToDatabase({
  platform: "ebay",
  transactionId: "EBAY123456",
  items: [
    { sku: "SKU123", quantity: 2 },
    { sku: "SKU456", quantity: 1 },
  ],
});
