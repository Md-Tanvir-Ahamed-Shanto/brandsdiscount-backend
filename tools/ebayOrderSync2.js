const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const { getValidAccessToken } = require("./ebayAuth2");
const { ebayUpdateInventory } = require("./ebayInventory");
const { walmartItemUpdate } = require("./wallmartInventory");
const { woocommerceItemUpdate } = require("./woocommerceInventory");
const { ebayUpdateInventory3 } = require("./ebayInventory3");

const prisma = new PrismaClient();

async function ebayOrderSync2() {
  const token = await getValidAccessToken();

  try {
    const now = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // Subtract 5 minutes and convert to ISO

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:%5B${now}..%5D&limit=180`;
    // const url = `https://marketplace.walmartapis.com/v3/orders?status=Created&productInfo=false&shipNodeType=SellerFulfilled&replacementInfo=false&createdStartDate=${encodeURIComponent(
    //   now
    // )}`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const response = await axios.get(url, { headers });
    const data = response.data;
    const existingOrders = await prisma.ebayOrder.findMany();
    console.log("exisitng orders", existingOrders);
    const newOrders = data.orders.filter(
      (order) =>
        !existingOrders.find((existing) => existing.orderId === order.orderId)
    );

    console.log(`new ordersssss`, newOrders);

    const clearDB = await prisma.ebayOrder.deleteMany({});
    const createOrders = await prisma.ebayOrder.createMany({
      data: newOrders.map((order) => ({
        orderId: order.orderId,
        orderCreationDate: new Date(order.creationDate),
        status: order.orderFulfillmentStatus,
      })),
    });
    console.log(`new ordersssss222222`, newOrders);

    newOrders.forEach(async (order) => {
      order.lineItems.forEach(async (item) => {
        console.log("syncing order:", order);
        const productData = await prisma.product.findUnique({
          where: {
            sku: item.sku,
          },
        });
        if (productData) {
          const updateProduct = await prisma.product.update({
            where: {
              sku: item.sku,
            },
            data: {
              stockQuantity: productData.stockQuantity - item.quantity,
            },
          });
          ebayUpdateInventory(
            item.sku,
            productData.stockQuantity - item.quantity
          );
          ebayUpdateInventory3(
            item.sku,
            productData.stockQuantity - item.quantity
          );
          walmartItemUpdate(
            item.sku,
            productData.stockQuantity - item.quantity
          );
          woocommerceItemUpdate(
            item.sku,
            productData.stockQuantity - item.quantity
          );
        }
      });
    });
    return newOrders;
  } catch (error) {
    console.error(
      "Error fetching Walmart orders:",
      error.response?.data || error.message
    );
    console.log(error);
  }
}

module.exports = {
  ebayOrderSync2,
};
