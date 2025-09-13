const axios = require("axios");
const prisma = require("../db/connection");
const {
  ebayUpdateStock2,
  ebayUpdateStock3,
  ebayUpdateStock,
} = require("./ebayUpdateStock");
const { getValidAccessToken2 } = require("../tools/ebayAuth2");
const { getValidAccessToken3 } = require("../tools/ebayAuth3");
const { getValidAccessToken } = require("../tools/ebayAuth");
const { updateStockBySku } = require("./wooComService");
const { walmartItemUpdate } = require("./walmartService");

async function ebayOrderSync() {
  try {
    console.log("Try eBay1 sync");
    const token = await getValidAccessToken();
    const fiveMinAgoISO = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${fiveMinAgoISO}..]&limit=180`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const response = await axios.get(url, { headers });
    const orders = response.data?.orders || [];

    // console.log("Order Sync Response: ", response)

    if (!orders.length) {
      console.log("No new eBay orders found.");
      return [];
    }

    const existingOrders = await prisma.ebayOrder.findMany({
      select: { orderId: true },
    });
    const existingOrderIds = new Set(existingOrders.map((o) => o.orderId));

    const newOrders = orders.filter(
      (order) => !existingOrderIds.has(order.orderId)
    );

    for (const order of newOrders) {
      await prisma.ebayOrder.create({
        data: {
          orderId: order.orderId,
          orderCreationDate: new Date(order.creationDate),
          status: order.orderFulfillmentStatus,
        },
      });

      const lineItems = order.lineItems || [];

      for (const item of lineItems) {
        const sku = item.sku;
        const qty = item.quantity;

        if (!sku || !qty) continue;

        const product = await prisma.product.findUnique({
          where: { sku },
        });

        if (product && product.stockQuantity != null) {
          const newStock = Math.max(product.stockQuantity - qty, 0); // Prevent negative

          await prisma.product.update({
            where: { sku },
            data: { stockQuantity: newStock },
          });
          
          createNotificationService({
            title: "Product Sold on eBay1",
            message: `Product ${sku} sold on eBay. Quantity: ${qty}`,
            location: "eBay1",
            selledBy: EBAY1,
          })

          // Try each platform update independently
          try {
            ebayUpdateStock2(sku, newStock);
          } catch (err) {
            console.warn("eBay2 inventory update failed:", err.message);
          }

          try {
            ebayUpdateStock3(sku, newStock);
          } catch (err) {
            console.warn("eBay3 inventory update failed:", err.message);
          }
          try {
            updateStockBySku(sku, newStock);
          } catch (error) {
            console.warn("WooCommerce inventory update failed:", error.message);
          }

          try {
            walmartItemUpdate(sku, newStock);
          } catch (err) {
            console.warn("Walmart inventory update failed:", err.message);
          }

          // try {
          //   woocommerceItemUpdate(sku, newStock);
          // } catch (err) {
          //   console.warn("WooCommerce inventory update failed:", err.message);
          // }
        }
      }
    }

    return newOrders;
  } catch (error) {
    console.error(
      "❌ Error syncing eBay orders:",
      error.response?.data || error.message
    );
    throw new Error("Order sync failed.");
  }
}

async function ebayOrderSync2() {
  try {
    console.log("Try eBay2 sync");
    const token = await getValidAccessToken2();
    const fiveMinAgoISO = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${fiveMinAgoISO}..]&limit=180`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const response = await axios.get(url, { headers });
    const orders = response.data?.orders || [];

    // console.log("Order Sync Response: ", response)

    if (!orders.length) {
      console.log("No new eBay2 orders found.");
      return [];
    }

    const existingOrders = await prisma.ebayOrder.findMany({
      select: { orderId: true },
    });
    const existingOrderIds = new Set(existingOrders.map((o) => o.orderId));

    const newOrders = orders.filter(
      (order) => !existingOrderIds.has(order.orderId)
    );

    for (const order of newOrders) {
      await prisma.ebayOrder.create({
        data: {
          orderId: order.orderId,
          orderCreationDate: new Date(order.creationDate),
          status: order.orderFulfillmentStatus,
        },
      });

      const lineItems = order.lineItems || [];

      for (const item of lineItems) {
        const sku = item.sku;
        const qty = item.quantity;

        if (!sku || !qty) continue;

        const product = await prisma.product.findUnique({
          where: { sku },
        });

        if (product && product.stockQuantity != null) {
          const newStock = Math.max(product.stockQuantity - qty, 0); // Prevent negative

          await prisma.product.update({
            where: { sku },
            data: { stockQuantity: newStock },
          });

           createNotificationService({
            title: "Product Sold on eBay2",
            message: `Product ${sku} sold on eBay. Quantity: ${qty}`,
            location: "eBay2",
            selledBy: EBAY2,
          })

          // Try each platform update independently
          try {
            ebayUpdateStock(sku, newStock);
          } catch (err) {
            console.warn("eBay2 inventory update failed:", err.message);
          }

          try {
            ebayUpdateStock3(sku, newStock);
          } catch (err) {
            console.warn("eBay3 inventory update failed:", err.message);
          }
          try {
            updateStockBySku(sku, newStock);
          } catch (error) {
            console.warn("WooCommerce inventory update failed:", error.message);
          }
           try {
            walmartItemUpdate(sku, newStock);
          } catch (err) {
            console.warn("Walmart inventory update failed:", err.message);
          }
        }
      }
    }

    return newOrders;
  } catch (error) {
    console.error(
      "❌ Error syncing eBay orders:",
      error.response?.data || error.message
    );
    throw new Error("Order sync failed.");
  }
}

async function ebayOrderSync3() {
  try {
    console.log("Try eBay3 sync");
    const token = await getValidAccessToken3();
    const fiveMinAgoISO = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${fiveMinAgoISO}..]&limit=180`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const response = await axios.get(url, { headers });
    const orders = response.data?.orders || [];

    // console.log("Order Sync Response: ", response)

    if (!orders.length) {
      console.log("No new eBay3 orders found.");
      return [];
    }

    const existingOrders = await prisma.ebayOrder.findMany({
      select: { orderId: true },
    });
    const existingOrderIds = new Set(existingOrders.map((o) => o.orderId));

    const newOrders = orders.filter(
      (order) => !existingOrderIds.has(order.orderId)
    );

    for (const order of newOrders) {
      await prisma.ebayOrder.create({
        data: {
          orderId: order.orderId,
          orderCreationDate: new Date(order.creationDate),
          status: order.orderFulfillmentStatus,
        },
      });

      const lineItems = order.lineItems || [];

      for (const item of lineItems) {
        const sku = item.sku;
        const qty = item.quantity;

        if (!sku || !qty) continue;

        const product = await prisma.product.findUnique({
          where: { sku },
        });

        if (product && product.stockQuantity != null) {
          const newStock = Math.max(product.stockQuantity - qty, 0); // Prevent negative

          await prisma.product.update({
            where: { sku },
            data: { stockQuantity: newStock },
          });

           createNotificationService({
            title: "Product Sold on eBay3",
            message: `Product ${sku} sold on eBay. Quantity: ${qty}`,
            location: "eBay3",
            selledBy: EBAY3,
          })

          // Try each platform update independently
          try {
            ebayUpdateStock(sku, newStock);
          } catch (err) {
            console.warn("eBay2 inventory update failed:", err.message);
          }

          try {
            ebayUpdateStock2(sku, newStock);
          } catch (err) {
            console.warn("eBay3 inventory update failed:", err.message);
          }
          try {
            updateStockBySku(sku, newStock);
          } catch (error) {
            console.warn("WooCommerce inventory update failed:", error.message);
          }
            try {
              walmartItemUpdate(sku, newStock);
            } catch (err) {
              console.warn("Walmart inventory update failed:", err.message);
            }

          //   try {
          //     woocommerceItemUpdate(sku, newStock);
          //   } catch (err) {
          //     console.warn("WooCommerce inventory update failed:", err.message);
          //   }
        }
      }
    }

    return newOrders;
  } catch (error) {
    console.error(
      "❌ Error syncing eBay orders:",
      error.response?.data || error.message
    );
    throw new Error("Order sync failed.");
  }
}

module.exports = {
  ebayOrderSync,
  ebayOrderSync2,
  ebayOrderSync3,
};
