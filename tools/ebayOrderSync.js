const { getValidAccessToken } = require("./ebayAuth");
const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const { ebayUpdateInventory2 } = require("./ebayInventory2");
const { walmartItemUpdate } = require("./wallmartInventory");
const { woocommerceItemUpdate } = require("./woocommerceInventory");
const { ebayUpdateInventory3 } = require("./ebayInventory3");

const prisma = new PrismaClient();

async function ebayOrderSync() {
  try {
    const token = await getValidAccessToken();
    const now = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:%5B${now}..%5D&limit=180`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const response = await axios.get(url, { headers });
    const data = response.data;

    const existingOrders = await prisma.ebayOrder.findMany();
    const newOrders = data.orders.filter(
      (order) => !existingOrders.find((o) => o.orderId === order.orderId)
    );

    // Save new orders
    for (const order of newOrders) {
      await prisma.ebayOrder.create({
        data: {
          orderId: order.orderId,
          orderCreationDate: new Date(order.creationDate),
          status: order.orderFulfillmentStatus,
        },
      });

      for (const item of order.lineItems) {
        const productData = await prisma.product.findUnique({
          where: { sku: item.sku },
        });

        if (productData) {
          const newStock = productData.stockQuantity - item.quantity;

          await prisma.product.update({
            where: { sku: item.sku },
            data: { stockQuantity: newStock },
          });

          ebayUpdateInventory2(item.sku, newStock);
          ebayUpdateInventory3(item.sku, newStock);
          walmartItemUpdate(item.sku, newStock);
          woocommerceItemUpdate(item.sku, newStock);
        }
      }
    }

    return newOrders;
  } catch (error) {
    console.error(
      "Error fetching eBay orders:",
      error.response?.data || error.message
    );
  }
}

module.exports = {
  ebayOrderSync,
};
