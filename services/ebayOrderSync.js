const axios = require("axios");
const { prisma, executeWithRetry } = require("../db/connection");
const {
  ebayUpdateStock2,
  ebayUpdateStock3,
  ebayUpdateStock,
} = require("./ebayUpdateStock");
const { getValidAccessToken2 } = require("../tools/ebayAuth2");
const { getValidAccessToken3 } = require("../tools/ebayAuth3");
const { getValidAccessToken } = require("../tools/ebayAuth");
const { updateStockBySku } = require("./wooComService");
const { walmartItemUpdate, walmartOrderSync2 } = require("./walmartService");
const { createNotification } = require("../utils/notification");
const syncLogger = require("../utils/syncLogger");

async function ebayOrderSync() {
  try {
    syncLogger.log('eBay1', 'orderSync', 'info', 'Try eBay1 sync');
    let token;
    try {
      token = await getValidAccessToken();
      syncLogger.log('eBay1', 'tokenRetrieval', 'success', 'eBay1 token retrieved successfully');
    } catch (tokenError) {
      syncLogger.log('eBay1', 'tokenRetrieval', 'error', 'eBay1 token retrieval failed', {
        error: tokenError.message,
        stack: tokenError.stack
      });
      console.error("Please re-authenticate eBay1 account through the authorization flow");
      return [];
    }
    
    const tenMinAgoISO = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${tenMinAgoISO}..]&limit=180`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    syncLogger.log('eBay1', 'orderSync', 'info', `Fetching eBay1 orders since ${tenMinAgoISO}`);
    let response;
    try {
      response = await axios.get(url, { headers });
      syncLogger.log('eBay1', 'orderSync', 'success', `✅ Successfully fetched ${response.data?.orders?.length || 0} eBay1 orders`);
    } catch (apiError) {
      syncLogger.log('eBay1', 'orderSync', 'error', `❌ eBay1 API error: ${apiError.message}`);
      if (apiError.response?.status === 401) {
        syncLogger.log('eBay1', 'orderSync', 'error', "Authentication error - token may be invalid. Please re-authenticate eBay1 account.");
      }
      return [];
    }
    const orders = response.data?.orders || [];

    // console.log("Order Sync Response: ", response)

    if (!orders.length) {
      syncLogger.log('eBay1', 'orderSync', 'info', "No new eBay orders found.");
      return [];
    }

    const existingOrders = await executeWithRetry(() => prisma.ebayOrder.findMany({
      select: { orderId: true },
    }));
    const existingOrderIds = new Set(existingOrders.map((o) => o.orderId));

    const newOrders = orders.filter(
      (order) => !existingOrderIds.has(order.orderId)
    );

    for (const order of newOrders) {
      await executeWithRetry(() => prisma.ebayOrder.create({
        data: {
          orderId: order.orderId,
          orderCreationDate: new Date(order.creationDate),
          status: order.orderFulfillmentStatus,
        },
      }));
      syncLogger.log('eBay1', 'orderSync', 'info', `Created new eBay1 order record: ${order.orderId}`);

      const lineItems = order.lineItems || [];

      for (const item of lineItems) {
        const sku = item.sku;
        const qty = item.quantity;

        if (!sku || !qty) continue;

        const product = await executeWithRetry(() => prisma.product.findUnique({
          where: { sku },
        }));

        if (product && product.stockQuantity != null) {
          const newStock = Math.max(product.stockQuantity - qty, 0); // Prevent negative
          syncLogger.log('eBay1', 'orderSync', 'info', `Updated stock for ${sku} to ${newStock}`);

          await executeWithRetry(() => prisma.product.update({
            where: { sku },
            data: { stockQuantity: newStock },
          }));

          try {
            const notification = await createNotification({
              title: "Product Sold on eBay1",
              message: `Product ${sku} sold on eBay. Quantity: ${qty}`,
              location: "eBay1",
              selledBy: "EBAY1",
            });
            syncLogger.log('eBay1', 'notification', 'success', `Notification created for eBay1 sale: ${notification.id}`, {
              sku,
              quantity: qty,
              notificationId: notification.id
            });
          } catch (err) {
            syncLogger.log('eBay1', 'notification', 'error', `Notification creation failed for eBay1 sale: ${err.message}`, {
              sku,
              quantity: qty,
              error: err.message
            });
            // Continue with stock updates despite notification failure
          }

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
            walmartItemUpdate(sku, newStock);
          } catch (err) {
            console.warn("Walmart inventory update failed:", err.message);
          }
          try {
            walmartOrderSync2(sku, newStock);
          } catch (error) {
            console.warn("Walmart2 inventory update failed:", error.message);
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

async function ebayOrderSync2() {
  syncLogger.log('eBay2', 'orderSync', 'info', 'Try eBay2 sync');
  try {
    let token;
    try {
      token = await getValidAccessToken2();
      syncLogger.log('eBay2', 'tokenRetrieval', 'success', 'eBay2 token retrieved successfully');
    } catch (tokenError) {
      syncLogger.log('eBay2', 'tokenRetrieval', 'error', 'eBay2 token retrieval failed', {
        error: tokenError.message,
        stack: tokenError.stack
      });
      console.error("Please re-authenticate eBay2 account through the authorization flow");
      return [];
    }
    
    const tenMinAgoISO = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${tenMinAgoISO}..]&limit=180`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    syncLogger.log('eBay2', 'orderSync', 'info', `Fetching eBay2 orders since ${tenMinAgoISO}`);
    let response;
    try {
      response = await axios.get(url, { headers });
      syncLogger.log('eBay2', 'orderSync', 'success', `✅ Successfully fetched ${response.data?.orders?.length || 0} eBay2 orders`);
    } catch (apiError) {
      syncLogger.log('eBay2', 'orderSync', 'error', `❌ eBay2 API error: ${apiError.message}`);
      if (apiError.response?.status === 401) {
        syncLogger.log('eBay2', 'orderSync', 'error', "Authentication error - token may be invalid. Please re-authenticate eBay2 account.");
      }
      return [];
    }
    const orders = response.data?.orders || [];

    // console.log("Order Sync Response: ", response)

    if (!orders.length) {
      syncLogger.log('eBay2', 'orderSync', 'info', "No new eBay2 orders found.");
      return [];
    }

    const existingOrders = await executeWithRetry(() => prisma.ebayOrder.findMany({
      select: { orderId: true },
    }));
    const existingOrderIds = new Set(existingOrders.map((o) => o.orderId));

    const newOrders = orders.filter(
      (order) => !existingOrderIds.has(order.orderId)
    );

    for (const order of newOrders) {
      await executeWithRetry(() => prisma.ebayOrder.create({
        data: {
          orderId: order.orderId,
          orderCreationDate: new Date(order.creationDate),
          status: order.orderFulfillmentStatus,
        },
      }));
      syncLogger.log('eBay2', 'orderSync', 'info', `Created new eBay2 order record: ${order.orderId}`);

      const lineItems = order.lineItems || [];

      for (const item of lineItems) {
        const sku = item.sku;
        const qty = item.quantity;

        if (!sku || !qty) continue;

        const product = await executeWithRetry(() => prisma.product.findUnique({
          where: { sku },
        }));

        if (product && product.stockQuantity != null) {
          const newStock = Math.max(product.stockQuantity - qty, 0); // Prevent negative
          syncLogger.log('eBay2', 'orderSync', 'info', `Updated stock for ${sku} to ${newStock}`);

          await executeWithRetry(() => prisma.product.update({
            where: { sku },
            data: { stockQuantity: newStock },
          }));

          try {
            const notification = await createNotification({
              title: "Product Sold on eBay2",
              message: `Product ${sku} sold on eBay. Quantity: ${qty}`,
              location: "eBay2",
              selledBy: "EBAY2",
            });
            syncLogger.log('eBay2', 'notification', 'success', `Notification created for eBay2 sale: ${notification.id}`, {
              sku,
              quantity: qty,
              notificationId: notification.id
            });
          } catch (err) {
            syncLogger.log('eBay2', 'notification', 'error', `Notification creation failed for eBay2 sale: ${err.message}`, {
              sku,
              quantity: qty,
              error: err.message
            });
            // Continue with stock updates despite notification failure
          }

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
            walmartItemUpdate(sku, newStock);
          } catch (err) {
            console.warn("Walmart inventory update failed:", err.message);
          }
          try {
            walmartOrderSync2(sku, newStock);
          } catch (error) {
            console.warn("Walmart2 inventory update failed:", error.message);
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
    let token;
    try {
      token = await getValidAccessToken3();
      syncLogger.log('eBay3', 'orderSync', 'info', "eBay3 token retrieved successfully");
    } catch (tokenError) {
      syncLogger.log('eBay3', 'orderSync', 'error', "❌ eBay3 token retrieval failed:", tokenError.message);
      syncLogger.log('eBay3', 'orderSync', 'error', "Please re-authenticate eBay3 account through the authorization flow");
      return [];
    }
    
    const tenMinAgoISO = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${tenMinAgoISO}..]&limit=180`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    syncLogger.log('eBay3', 'orderSync', 'info', `Fetching eBay3 orders since ${tenMinAgoISO}`);
    let response;
    try {
      response = await axios.get(url, { headers });
      syncLogger.log('eBay3', 'orderSync', 'success', `✅ Successfully fetched ${response.data?.orders?.length || 0} eBay3 orders`);
    } catch (apiError) {
      syncLogger.log('eBay3', 'orderSync', 'error', `❌ eBay3 API error: ${apiError.message}`);
      if (apiError.response?.status === 401) {
        syncLogger.log('eBay3', 'orderSync', 'error', "Authentication error - token may be invalid. Please re-authenticate eBay3 account.");
      }
      return [];
    }
    const orders = response.data?.orders || [];

    // console.log("Order Sync Response: ", response)

    if (!orders.length) {
      syncLogger.log('eBay3', 'orderSync', 'info', "No new eBay3 orders found.");
      return [];
    }

    const existingOrders = await executeWithRetry(() => prisma.ebayOrder.findMany({
      select: { orderId: true },
    }));
    const existingOrderIds = new Set(existingOrders.map((o) => o.orderId));

    const newOrders = orders.filter(
      (order) => !existingOrderIds.has(order.orderId)
    );

    for (const order of newOrders) {
      await executeWithRetry(() => prisma.ebayOrder.create({
        data: {
          orderId: order.orderId,
          orderCreationDate: new Date(order.creationDate),
          status: order.orderFulfillmentStatus,
        },
      }));
      syncLogger.log('eBay3', 'orderSync', 'info', `Created new eBay3 order record: ${order.orderId}`);

      const lineItems = order.lineItems || [];

      for (const item of lineItems) {
        const sku = item.sku;
        const qty = item.quantity;

        if (!sku || !qty) continue;

        const product = await executeWithRetry(() => prisma.product.findUnique({
          where: { sku },
        }));

        if (product && product.stockQuantity != null) {
          const newStock = Math.max(product.stockQuantity - qty, 0); // Prevent negative

          await executeWithRetry(() => prisma.product.update({
            where: { sku },
            data: { stockQuantity: newStock },
          }));
          syncLogger.log('eBay3', 'orderSync', 'info', `Updated stock for ${sku} to ${newStock}`);

          try {
            const notification = await createNotification({
              title: "Product Sold on eBay3",
              message: `Product ${sku} sold on eBay. Quantity: ${qty}`,
              location: "eBay3",
              selledBy: "EBAY3",
            });
            syncLogger.log('eBay3', 'notification', 'success', `Notification created for eBay3 sale: ${notification.id}`, {
              sku,
              quantity: qty,
              notificationId: notification.id
            });
          } catch (err) {
            syncLogger.log('eBay3', 'notification', 'error', `Notification creation failed for eBay3 sale: ${err.message}`, {
              sku,
              quantity: qty,
              error: err.message
            });
            // Continue with stock updates despite notification failure
          }

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
            walmartItemUpdate(sku, newStock);
          } catch (err) {
            console.warn("Walmart inventory update failed:", err.message);
          }
          try {
            walmartOrderSync2(sku, newStock);
          } catch (error) {
            console.warn("Walmart2 inventory update failed:", error.message);
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

async function getEbayOneLatestOrders() {
 try {
    let token;
    try {
      token = await getValidAccessToken();
      syncLogger.log('eBay1', 'tokenRetrieval', 'success', 'eBay1 token retrieved successfully');
    } catch (tokenError) {
      syncLogger.log('eBay1', 'tokenRetrieval', 'error', 'eBay1 token retrieval failed', {
        error: tokenError.message,
        stack: tokenError.stack
      });
      console.error("Please re-authenticate eBay1 account through the authorization flow");
      return [];
    }
    
   const oneDayAgoISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${oneDayAgoISO}..]&limit=180`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    console.log(`Fetching eBay1 orders since ${oneDayAgoISO}`);
    let response;
    try {
      response = await axios.get(url, { headers });
      console.log(`✅ Successfully fetched ${response.data?.orders?.length || 0} eBay1 orders`);
            console.log("ebay1 response ", response.data?.orders)
    } catch (apiError) {
      console.error(`❌ eBay1 API error: ${apiError.message}`);
      if (apiError.response?.status === 401) {
        console.error("Authentication error - token may be invalid. Please re-authenticate eBay1 account.");
      }
      return [];
    }
    const orders = response.data?.orders || [];
    return orders;
 } catch (error) {
   console.error("❌ Error eBay1 orders:", error.response?.data || error.message);
   throw new Error( "Failed to get eBay1 orders.");
 }
}
async function getEbayTwoLatestOrders() {
 try {
    let token;
    try {
      token = await getValidAccessToken2();
      syncLogger.log('eBay2', 'tokenRetrieval', 'success', 'eBay2 token retrieved successfully');
    } catch (tokenError) {
      syncLogger.log('eBay2', 'tokenRetrieval', 'error', 'eBay2 token retrieval failed', {
        error: tokenError.message,
        stack: tokenError.stack
      });
      console.error("Please re-authenticate eBay2 account through the authorization flow");
      return [];
    }
    
       const oneDayAgoISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${oneDayAgoISO}..]&limit=180`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    console.log(`Fetching eBay2 orders since ${oneDayAgoISO}`);
    let response;
    try {
      response = await axios.get(url, { headers });
      console.log(`✅ Successfully fetched ${response.data?.orders?.length || 0} eBay2 orders`);
    } catch (apiError) {
      console.error(`❌ eBay2 API error: ${apiError.message}`);
      if (apiError.response?.status === 401) {
        console.error("Authentication error - token may be invalid. Please re-authenticate eBay2 account.");
      }
      return [];
    }
    const orders = response.data?.orders || [];
    return orders;
 } catch (error) {
   console.error("❌ Error eBay2 orders:", error.response?.data || error.message);
   throw new Error( "Failed to get eBay2 orders.");
 }
}
async function getEbayThreeLatestOrders() {
 try {
    let token;
    try {
      token = await getValidAccessToken3();
      syncLogger.log('eBay3', 'tokenRetrieval', 'success', 'eBay3 token retrieved successfully');
    } catch (tokenError) {
      syncLogger.log('eBay3', 'tokenRetrieval', 'error', 'eBay3 token retrieval failed', {
        error: tokenError.message,
        stack: tokenError.stack
      });
      console.error("Please re-authenticate eBay3 account through the authorization flow");
      return [];
    }
    
       const oneDayAgoISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${oneDayAgoISO}..]&limit=180`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    console.log(`Fetching eBay3 orders since ${oneDayAgoISO}`);
    let response;
    try {
      response = await axios.get(url, { headers });
      console.log(`✅ Successfully fetched ${response.data?.orders?.length || 0} eBay3 orders`);

    } catch (apiError) {
      console.error(`❌ eBay3 API error: ${apiError.message}`);
      if (apiError.response?.status === 401) {
        console.error("Authentication error - token may be invalid. Please re-authenticate eBay3 account.");
      }
      return [];
    }
    const orders = response.data?.orders || [];
    return orders;
 } catch (error) {
   console.error("❌ Error eBay3 orders:", error.response?.data || error.message);
   throw new Error( "Failed to get eBay3 orders.");
 }
}




async function ManualEbayOrderSync() {
  try {
    syncLogger.log('eBay1', 'orderSync', 'info', 'Try eBay1 sync');
    let token;
    try {
      token = await getValidAccessToken();
      syncLogger.log('eBay1', 'tokenRetrieval', 'success', 'eBay1 token retrieved successfully');
    } catch (tokenError) {
      syncLogger.log('eBay1', 'tokenRetrieval', 'error', 'eBay1 token retrieval failed', {
        error: tokenError.message,
        stack: tokenError.stack
      });
      console.error("Please re-authenticate eBay1 account through the authorization flow");
      return [];
    }
    
    const oneDayAgoISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${oneDayAgoISO}..]&limit=180`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    console.log(`Fetching eBay1 orders since ${oneDayAgoISO}`);
    let response;
    try {
      response = await axios.get(url, { headers });
      console.log(`✅ Successfully fetched ${response.data?.orders?.length || 0} eBay1 orders`);
    } catch (apiError) {
      console.error(`❌ eBay1 API error: ${apiError.message}`);
      if (apiError.response?.status === 401) {
        console.error("Authentication error - token may be invalid. Please re-authenticate eBay1 account.");
      }
      return [];
    }
    const orders = response.data?.orders || [];

    // console.log("Order Sync Response: ", response)

    if (!orders.length) {
      console.log("No new eBay orders found.");
      return [];
    }

    const existingOrders = await executeWithRetry(() => prisma.ebayOrder.findMany({
      select: { orderId: true },
    }));
    const existingOrderIds = new Set(existingOrders.map((o) => o.orderId));

    const newOrders = orders.filter(
      (order) => !existingOrderIds.has(order.orderId)
    );

    for (const order of newOrders) {
      await executeWithRetry(() => prisma.ebayOrder.create({
        data: {
          orderId: order.orderId,
          orderCreationDate: new Date(order.creationDate),
          status: order.orderFulfillmentStatus,
        },
      }));
      syncLogger.log('eBay1', 'orderSync', 'info', `Created new eBay1 order record: ${order.orderId}`);

      const lineItems = order.lineItems || [];

      for (const item of lineItems) {
        const sku = item.sku;
        const qty = item.quantity;

        if (!sku || !qty) continue;

        const product = await executeWithRetry(() => prisma.product.findUnique({
          where: { sku },
        }));

        if (product && product.stockQuantity != null) {
          const newStock = Math.max(product.stockQuantity - qty, 0); // Prevent negative

          await executeWithRetry(() => prisma.product.update({
            where: { sku },
            data: { stockQuantity: newStock },
          }));

          try {
            const notification = await createNotification({
              title: "Product Sold on eBay1",
              message: `Product ${sku} sold on eBay. Quantity: ${qty}`,
              location: "eBay1",
              selledBy: "EBAY1",
            });
            syncLogger.log('eBay1', 'notification', 'success', `Notification created for eBay1 sale: ${notification.id}`, {
              sku,
              quantity: qty,
              notificationId: notification.id
            });
          } catch (err) {
            syncLogger.log('eBay1', 'notification', 'error', `Notification creation failed for eBay1 sale: ${err.message}`, {
              sku,
              quantity: qty,
              error: err.message
            });
            // Continue with stock updates despite notification failure
          }

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
            walmartItemUpdate(sku, newStock);
          } catch (err) {
            console.warn("Walmart inventory update failed:", err.message);
          }
          try {
            walmartOrderSync2(sku, newStock);
          } catch (error) {
            console.warn("Walmart2 inventory update failed:", error.message);
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

async function ManualEbayOrderSync2() {
  syncLogger.log('eBay2', 'orderSync', 'info', 'Try eBay2 sync');
  try {
    let token;
    try {
      token = await getValidAccessToken2();
      syncLogger.log('eBay2', 'tokenRetrieval', 'success', 'eBay2 token retrieved successfully');
    } catch (tokenError) {
      syncLogger.log('eBay2', 'tokenRetrieval', 'error', 'eBay2 token retrieval failed', {
        error: tokenError.message,
        stack: tokenError.stack
      });
      console.error("Please re-authenticate eBay2 account through the authorization flow");
      return [];
    }
    
    const oneDayAgoISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${oneDayAgoISO}..]&limit=180`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    syncLogger.log('eBay2', 'orderSync', 'info', `Fetching eBay2 orders since ${oneDayAgoISO}`);
    let response;
    try {
      response = await axios.get(url, { headers });
      syncLogger.log('eBay2', 'orderSync', 'success', `✅ Successfully fetched ${response.data?.orders?.length || 0} eBay2 orders`);
    } catch (apiError) {
      console.error(`❌ eBay2 API error: ${apiError.message}`);
      if (apiError.response?.status === 401) {
        console.error("Authentication error - token may be invalid. Please re-authenticate eBay2 account.");
      }
      return [];
    }
    const orders = response.data?.orders || [];

    // console.log("Order Sync Response: ", response)

    if (!orders.length) {
      console.log("No new eBay2 orders found.");
      return [];
    }

    const existingOrders = await executeWithRetry(() => prisma.ebayOrder.findMany({
      select: { orderId: true },
    }));
    const existingOrderIds = new Set(existingOrders.map((o) => o.orderId));

    const newOrders = orders.filter(
      (order) => !existingOrderIds.has(order.orderId)
    );

    for (const order of newOrders) {
      await executeWithRetry(() => prisma.ebayOrder.create({
        data: {
          orderId: order.orderId,
          orderCreationDate: new Date(order.creationDate),
          status: order.orderFulfillmentStatus,
        },
      }));

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
          syncLogger.log('eBay2', 'orderSync', 'info', `Created new eBay2 order record: ${order.orderId}`);
          await executeWithRetry(() => prisma.product.update({
            where: { sku },
            data: { stockQuantity: newStock },
          }));

          try {
            const notification = await createNotification({
              title: "Product Sold on eBay2",
              message: `Product ${sku} sold on eBay. Quantity: ${qty}`,
              location: "eBay2",
              selledBy: "EBAY2",
            });
            syncLogger.log('eBay2', 'notification', 'success', `Notification created for eBay2 sale: ${notification.id}`, {
              sku,
              quantity: qty,
              notificationId: notification.id
            });
          } catch (err) {
            syncLogger.log('eBay2', 'notification', 'error', `Notification creation failed for eBay2 sale: ${err.message}`, {
              sku,
              quantity: qty,
              error: err.message
            });
            // Continue with stock updates despite notification failure
          }

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
            walmartItemUpdate(sku, newStock);
          } catch (err) {
            console.warn("Walmart inventory update failed:", err.message);
          }
          try {
            walmartOrderSync2(sku, newStock);
          } catch (error) {
            console.warn("Walmart2 inventory update failed:", error.message);
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

async function ManualEbayOrderSync3() {
  try {
    console.log("Try eBay3 sync");
    let token;
    try {
      token = await getValidAccessToken3();
      syncLogger.log('eBay3', 'orderSync', 'info', "eBay3 token retrieved successfully");
    } catch (tokenError) {
      syncLogger.log('eBay3', 'orderSync', 'error', "❌ eBay3 token retrieval failed:", tokenError.message);
      console.error("Please re-authenticate eBay3 account through the authorization flow");
      return [];
    }
    
    const oneDayAgoISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${oneDayAgoISO}..]&limit=180`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    syncLogger.log('eBay3', 'orderSync', 'info', `Fetching eBay3 orders since ${oneDayAgoISO}`);
    let response;
    try {
      response = await axios.get(url, { headers });
      syncLogger.log('eBay3', 'orderSync', 'success', `✅ Successfully fetched ${response.data?.orders?.length || 0} eBay3 orders`);
    } catch (apiError) {
      syncLogger.log('eBay3', 'orderSync', 'error', `❌ eBay3 API error: ${apiError.message}`);
      if (apiError.response?.status === 401) {
        syncLogger.log('eBay3', 'orderSync', 'error', "Authentication error - token may be invalid. Please re-authenticate eBay3 account.");
      }
      return [];
    }
    const orders = response.data?.orders || [];

    // console.log("Order Sync Response: ", response)

    if (!orders.length) {
      syncLogger.log('eBay3', 'orderSync', 'info', "No new eBay3 orders found.");
      return [];
    }

    const existingOrders = await executeWithRetry(() => prisma.ebayOrder.findMany({
      select: { orderId: true },
    }));
    const existingOrderIds = new Set(existingOrders.map((o) => o.orderId));

    const newOrders = orders.filter(
      (order) => !existingOrderIds.has(order.orderId)
    );

    for (const order of newOrders) {
      await executeWithRetry(() => prisma.ebayOrder.create({
        data: {
          orderId: order.orderId,
          orderCreationDate: new Date(order.creationDate),
          status: order.orderFulfillmentStatus,
        },
      }));
      syncLogger.log('eBay3', 'orderSync', 'info', `Created new eBay3 order record: ${order.orderId}`);

      const lineItems = order.lineItems || [];

      for (const item of lineItems) {
        const sku = item.sku;
        const qty = item.quantity;

        if (!sku || !qty) continue;

        const product = await executeWithRetry(() => prisma.product.findUnique({
          where: { sku },
        }));

        if (product && product.stockQuantity != null) {
          const newStock = Math.max(product.stockQuantity - qty, 0); // Prevent negative

          await executeWithRetry(() => prisma.product.update({
            where: { sku },
            data: { stockQuantity: newStock },
          }));

          try {
            const notification = await createNotification({
              title: "Product Sold on eBay3",
              message: `Product ${sku} sold on eBay. Quantity: ${qty}`,
              location: "eBay3",
              selledBy: "EBAY3",
            });
            syncLogger.log('eBay3', 'notification', 'success', `Notification created for eBay3 sale: ${notification.id}`, {
              sku,
              quantity: qty,
              notificationId: notification.id
            });
          } catch (err) {
            syncLogger.log('eBay3', 'notification', 'error', `Notification creation failed for eBay3 sale: ${err.message}`, {
              sku,
              quantity: qty,
              error: err.message
            });
            // Continue with stock updates despite notification failure
          }

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
            walmartItemUpdate(sku, newStock);
          } catch (err) {
            console.warn("Walmart inventory update failed:", err.message);
          }
          try {
            walmartOrderSync2(sku, newStock);
          } catch (error) {
            console.warn("Walmart2 inventory update failed:", error.message);
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


module.exports = {
  ebayOrderSync,
  ebayOrderSync2,
  ebayOrderSync3,
  getEbayOneLatestOrders,
  getEbayTwoLatestOrders,
  getEbayThreeLatestOrders,
  ManualEbayOrderSync,
  ManualEbayOrderSync2,
  ManualEbayOrderSync3,
};
