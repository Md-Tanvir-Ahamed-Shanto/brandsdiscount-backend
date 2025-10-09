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

async function ebayOrderSync() {
  try {
    console.log('Try eBay1 sync');
    let token;
    try {
      token = await getValidAccessToken();
    } catch (tokenError) {
      console.error("Please re-authenticate eBay1 account through the authorization flow");
      return [];
    }
    
    const tenMinAgoISO = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${tenMinAgoISO}..]&limit=180`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

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

    if (!orders.length) {
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
            await createNotification({
              title: "Product Sold on eBay1",
              message: `Product ${sku} sold on eBay. Quantity: ${qty}`,
              location: "eBay1",
              selledBy: "EBAY1",
            });
          } catch (err) {
            // Continue with stock updates despite notification failure
          }

          // Try each platform update independently with proper async handling
          try {
            await ebayUpdateStock2(sku, newStock);
            console.log(`✅ [eBay1 Order] Successfully updated eBay2 stock for ${sku} to ${newStock}`);
          } catch (err) {
            console.warn(`❌ [eBay1 Order] eBay2 inventory update failed for ${sku}: ${err.message}`);
          }

          try {
            await ebayUpdateStock3(sku, newStock);
            console.log(`✅ [eBay1 Order] Successfully updated eBay3 stock for ${sku} to ${newStock}`);
          } catch (err) {
            console.warn(`❌ [eBay1 Order] eBay3 inventory update failed for ${sku}: ${err.message}`);
          }

          try {
            await walmartItemUpdate(sku, newStock);
            console.log(`✅ [eBay1 Order] Successfully updated Walmart stock for ${sku} to ${newStock}`);
          } catch (err) {
            console.warn(`❌ [eBay1 Order] Walmart inventory update failed for ${sku}: ${err.message}`);
          }
          
          try {
            await walmartOrderSync2(sku, newStock);
            console.log(`✅ [eBay1 Order] Successfully updated Walmart2 stock for ${sku} to ${newStock}`);
          } catch (error) {
            console.warn(`❌ [eBay1 Order] Walmart2 inventory update failed for ${sku}: ${error.message}`);
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
  console.log('Try eBay2 sync');
  try {
    let token;
    try {
      token = await getValidAccessToken2();
    } catch (tokenError) {
      console.error("Please re-authenticate eBay2 account through the authorization flow");
      return [];
    }
    
    const tenMinAgoISO = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${tenMinAgoISO}..]&limit=180`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

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

    if (!orders.length) {
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
            await createNotification({
              title: "Product Sold on eBay2",
              message: `Product ${sku} sold on eBay. Quantity: ${qty}`,
              location: "eBay2",
              selledBy: "EBAY2",
            });
          } catch (err) {
            // Continue with stock updates despite notification failure
          }

          // Try each platform update independently with proper async handling
          try {
            await ebayUpdateStock(sku, newStock);
            console.log(`✅ [eBay2 Order] Successfully updated eBay1 stock for ${sku} to ${newStock}`);
          } catch (err) {
            console.warn(`❌ [eBay2 Order] eBay1 inventory update failed for ${sku}: ${err.message}`);
          }

          try {
            await ebayUpdateStock3(sku, newStock);
            console.log(`✅ [eBay2 Order] Successfully updated eBay3 stock for ${sku} to ${newStock}`);
          } catch (err) {
            console.warn(`❌ [eBay2 Order] eBay3 inventory update failed for ${sku}: ${err.message}`);
          }
          
          try {
            await walmartItemUpdate(sku, newStock);
            console.log(`✅ [eBay2 Order] Successfully updated Walmart stock for ${sku} to ${newStock}`);
          } catch (err) {
            console.warn(`❌ [eBay2 Order] Walmart inventory update failed for ${sku}: ${err.message}`);
          }
          
          try {
            await walmartOrderSync2(sku, newStock);
            console.log(`✅ [eBay2 Order] Successfully updated Walmart2 stock for ${sku} to ${newStock}`);
          } catch (error) {
            console.warn(`❌ [eBay2 Order] Walmart2 inventory update failed for ${sku}: ${error.message}`);
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
    } catch (tokenError) {
      console.error("Please re-authenticate eBay3 account through the authorization flow");
      return [];
    }
    
    const tenMinAgoISO = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${tenMinAgoISO}..]&limit=180`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

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

    if (!orders.length) {
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
            await createNotification({
              title: "Product Sold on eBay3",
              message: `Product ${sku} sold on eBay. Quantity: ${qty}`,
              location: "eBay3",
              selledBy: "EBAY3",
            });
          } catch (err) {
            // Continue with stock updates despite notification failure
          }

          // Try each platform update independently with proper async handling
          try {
            await ebayUpdateStock(sku, newStock);
            console.log(`✅ [eBay3 Order] Successfully updated eBay1 stock for ${sku} to ${newStock}`);
          } catch (err) {
            console.warn(`❌ [eBay3 Order] eBay1 inventory update failed for ${sku}: ${err.message}`);
          }

          try {
            await ebayUpdateStock2(sku, newStock);
            console.log(`✅ [eBay3 Order] Successfully updated eBay2 stock for ${sku} to ${newStock}`);
          } catch (err) {
            console.warn(`❌ [eBay3 Order] eBay2 inventory update failed for ${sku}: ${err.message}`);
          }
          
          try {
            await walmartItemUpdate(sku, newStock);
            console.log(`✅ [eBay3 Order] Successfully updated Walmart stock for ${sku} to ${newStock}`);
          } catch (err) {
            console.warn(`❌ [eBay3 Order] Walmart inventory update failed for ${sku}: ${err.message}`);
          }
          
          try {
            await walmartOrderSync2(sku, newStock);
            console.log(`✅ [eBay3 Order] Successfully updated Walmart2 stock for ${sku} to ${newStock}`);
          } catch (error) {
            console.warn(`❌ [eBay3 Order] Walmart2 inventory update failed for ${sku}: ${error.message}`);
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

async function getEbayOneLatestOrders(days = 1) {
 try {
    let token;
    try {
      token = await getValidAccessToken();
    } catch (tokenError) {
      console.error("Please re-authenticate eBay1 account through the authorization flow");
      return [];
    }
    
   // Convert days to a number and ensure it's at least 1
   const daysNum = Math.max(1, parseInt(days) || 1);
   const pastDateISO = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${pastDateISO}..]&limit=180`;

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
async function getEbayTwoLatestOrders(days = 1) {
 try {
    let token;
    try {
      token = await getValidAccessToken2();
    } catch (tokenError) {
      console.error("Please re-authenticate eBay2 account through the authorization flow");
      return [];
    }
    
    // Convert days to a number and ensure it's at least 1
    const daysNum = Math.max(1, parseInt(days) || 1);
    const pastDateISO = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${pastDateISO}..]&limit=180`;

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
async function getEbayThreeLatestOrders(days = 1) {
 try {
    let token;
    try {
      token = await getValidAccessToken3();
    } catch (tokenError) {
      console.error("Please re-authenticate eBay3 account through the authorization flow");
      return [];
    }
    
    // Convert days to a number and ensure it's at least 1
    const daysNum = Math.max(1, parseInt(days) || 1);
    const pastDateISO = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${pastDateISO}..]&limit=180`;

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




async function ManualEbayOrderSync(days = 1) {
  try {
    console.log('Try eBay1 sync');
    let token;
    try {
      token = await getValidAccessToken();
    } catch (tokenError) {
      console.error("Please re-authenticate eBay1 account through the authorization flow");
      return [];
    }
    
    // Convert days to a number and ensure it's at least 1
    const daysNum = Math.max(1, parseInt(days) || 1);
    const pastDateISO = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${pastDateISO}..]&limit=180`;

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
            await createNotification({
              title: "Product Sold on eBay1",
              message: `Product ${sku} sold on eBay. Quantity: ${qty}`,
              location: "eBay1",
              selledBy: "EBAY1",
            });
          } catch (err) {
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

async function ManualEbayOrderSync2(days = 1) {
  console.log('Try eBay2 sync');
  try {
    let token;
    try {
      token = await getValidAccessToken2();
    } catch (tokenError) {
      console.error("Please re-authenticate eBay2 account through the authorization flow");
      return [];
    }
    
    // Convert days to a number and ensure it's at least 1
    const daysNum = Math.max(1, parseInt(days) || 1);
    const pastDateISO = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${pastDateISO}..]&limit=180`;

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
          console.log(`Created new eBay2 order record: ${order.orderId}`);
          await executeWithRetry(() => prisma.product.update({
            where: { sku },
            data: { stockQuantity: newStock },
          }));

          try {
            await createNotification({
              title: "Product Sold on eBay2",
              message: `Product ${sku} sold on eBay. Quantity: ${qty}`,
              location: "eBay2",
              selledBy: "EBAY2",
            });
          } catch (err) {
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

async function ManualEbayOrderSync3(days = 1) {
  try {
    console.log("Try eBay3 sync");
    let token;
    try {
      token = await getValidAccessToken3();
    } catch (tokenError) {
      console.error("Please re-authenticate eBay3 account through the authorization flow");
      return [];
    }
    
    // Convert days to a number and ensure it's at least 1
    const daysNum = Math.max(1, parseInt(days) || 1);
    const pastDateISO = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString();

    const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${pastDateISO}..]&limit=180`;

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

    // console.log("Order Sync Response: ", response)

    if (!orders.length) {
      console.log("No new eBay3 orders found.");
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
      console.log(`Created new eBay3 order record: ${order.orderId}`);

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
            await createNotification({
              title: "Product Sold on eBay3",
              message: `Product ${sku} sold on eBay. Quantity: ${qty}`,
              location: "eBay3",
              selledBy: "EBAY3",
            });
          } catch (err) {
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
