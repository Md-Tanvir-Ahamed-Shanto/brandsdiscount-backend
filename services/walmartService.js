const axios = require("axios");

const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const { getValidAccessToken } = require("../tools/wallmartAuth");
const prisma = require("../db/connection");
const { v4: uuidv4 } = require("uuid");
const { ebayUpdateStock, ebayUpdateStock2, ebayUpdateStock3 } = require("./ebayUpdateStock");
const { updateStockBySku } = require("./wooComService");
const { createNotification } = require("../utils/notification");

/**
 * 🔍 Check if item exists by SKU
 */
async function checkIfSkuExists(sku) {
  const token = await getValidAccessToken();
  const correlationId = uuidv4();

  try {
    const res = await axios.get(`${BASE_URL}/items/${sku}`, {
      headers: {
        Accept: "application/json",
        "WM_SVC.NAME": "Walmart Marketplace",
        "WM_QOS.CORRELATION_ID": correlationId,
        "WM_SEC.ACCESS_TOKEN": token,
        "WM_MARKET": "us",
      },
    });
    return res.data;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return null; // SKU not found
    }
    throw err;
  }
}

/**
 * 📦 Create New Product on Walmart
 */
async function createWalmartProduct(product) {
  const sku = product.sku;
  const exists = await checkIfSkuExists(sku);

  if (exists) {
    console.warn(`⚠️ Product with SKU "${sku}" already exists. Skipping creation.`);
    return;
  }

  const token = await getValidAccessToken();
  const correlationId = uuidv4();

  try {
    const res = await axios.post(`${BASE_URL}/items`, product, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "WM_SVC.NAME": "Walmart Marketplace",
        "WM_QOS.CORRELATION_ID": correlationId,
        "WM_SEC.ACCESS_TOKEN": token,
        "WM_MARKET": "us",
      },
    });
    console.log("✅ Product created:", res.data);
    return res.data;
  } catch (err) {
    console.error("❌ Create error:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * 🛠️ Update Existing Product on Walmart
 */
async function updateWalmartProduct(product) {
  const sku = product.sku;
  const exists = await checkIfSkuExists(sku);

  if (!exists) {
    console.warn(`❌ Product with SKU "${sku}" does not exist. Cannot update.`);
    return;
  }

  const token = await getValidAccessToken();
  const correlationId = uuidv4();

  try {
    const res = await axios.post(`${BASE_URL}/items`, product, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "WM_SVC.NAME": "Walmart Marketplace",
        "WM_QOS.CORRELATION_ID": correlationId,
        "WM_SEC.ACCESS_TOKEN": token,
        "WM_MARKET": "us",
      },
    });
    console.log("✅ Product updated:", res.data);
    return res.data;
  } catch (err) {
    console.error("❌ Update error:", err.response?.data || err.message);
    throw err;
  }
}



async function listWalmartProduct() {
  try {
    const access_token = await getValidAccessToken();

    const filePath = path.join(__dirname, "../wallmart.json");
    const fileStream = fs.createReadStream(filePath);

    const form = new FormData();
    form.append("file", fileStream, {
      filename: "wallmart.json",
      contentType: "application/json",
    });

    const response = await axios.post(
      "https://marketplace.walmartapis.com/v3/feeds?feedType=item",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Accept: "application/json",
          "WM_SVC.NAME": "Walmart Marketplace",
          "WM_QOS.CORRELATION_ID": "290554c7-caaa-4f2d-ada6-572b3b7fca88",
          "WM_SEC.ACCESS_TOKEN": access_token,
        },
      }
    );
    console.log(response.status);
    console.log("✅ Walmart Feed Upload Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Error uploading feed:",
      error.response?.data || error.message
    );
    return null;
  }
}




async function walmartItemUpdate(sku, quantity) {
  const updateData = {
    quantity: {
      unit: "EACH",
      amount: quantity,
    },
  };
  const token = await getValidAccessToken();
  try {
    const url = `https://marketplace.walmartapis.com/v3/inventory?sku=${sku}`;
    const headers = {
      "WM_QOS.CORRELATION_ID": "790554c7-caaa-4f2d-ada6-572b3b7fca88",
      "WM_SEC.ACCESS_TOKEN": token,
      "WM_SVC.NAME": "Walmart Marketplace",
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const response = await axios.put(url, updateData, { headers });
    console.log("✅ Walmart Inventory Update Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Walmart Inventory Update Error:",
      error.response?.data || error.message
    );
  }
}



async function walmartOrderSync() {
  console.log("Attempting Walmart order sync...");
  try {
    const token = await getValidAccessToken(); 
    const fiveMinAgoISO = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const url = `https://marketplace.walmartapis.com/v3/orders?createdStartDate=${encodeURIComponent(fiveMinAgoISO)}&status=Created&productInfo=true&limit=100&shipNodeType=SellerFulfilled&replacementInfo=false`;

    const headers = {
  
      "WM_QOS.CORRELATION_ID": "790554c7-caaa-4f2d-ada6-572b3b7fca88",
      "WM_SEC.ACCESS_TOKEN": token,
      "WM_SVC.NAME": "Walmart Marketplace",
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const response = await axios.get(url, { headers });
    const ordersData = response.data?.list?.elements?.order || [];

    if (!ordersData.length) {
      console.log("No new Walmart orders found.");
      return [];
    }

    const existingOrders = await prisma.walmartOrder.findMany({
      select: { orderId: true }, 
    });
    const existingOrderIds = new Set(existingOrders.map((o) => o.orderId));

    const newOrders = ordersData.filter(
      (order) => !existingOrderIds.has(order.purchaseOrderId)
    );

    if (!newOrders.length) {
      console.log("All fetched Walmart orders already exist in the database.");
      return [];
    }

    const ordersToCreate = newOrders.map((order) => ({
      orderId: order.purchaseOrderId,
      orderCreationDate: new Date(order.orderDate),
      status: order.orderStatus,
    }));

  
    await prisma.walmartOrder.createMany({
      data: ordersToCreate,
      skipDuplicates: true, 
    });
    console.log(`Successfully recorded ${ordersToCreate.length} new Walmart orders locally.`);

    // Process each new order to update product stock
    for (const order of newOrders) {
      const lineItems = order.orderLines?.orderLine || [];

      for (const item of lineItems) {
        const sku = item.item?.sku;
        const qty = item.orderLineQuantity?.amount;

        if (!sku || qty == null) {
          console.warn(`Skipping item due to missing SKU or Quantity in Walmart order ${order.purchaseOrderId}. Item:`, item);
          continue;
        }

        const product = await prisma.product.findUnique({
          where: { sku },
        });

        if (product && product.stockQuantity != null) {
          const newStock = Math.max(product.stockQuantity - qty, 0); 
          await prisma.product.update({
            where: { sku },
            data: { stockQuantity: newStock },
          });
          console.log(`Updated local stock for SKU ${sku} to ${newStock} from Walmart order ${order.purchaseOrderId}.`);

          createNotification({
            title: "Product Sold on Walmart",
            message: `Product ${sku} sold on Walmart. Quantity: ${qty}`,
            location: "Walmart",
            selledBy: "WALMART",
          });

          try {
            await Promise.allSettled([
              ebayUpdateStock(sku, newStock),
              ebayUpdateStock2(sku, newStock), 
              ebayUpdateStock3(sku, newStock), 
              updateStockBySku(sku, newStock),
              walmartItemUpdate(sku, newStock),
            ]).then(results => {
              results.forEach((result, index) => {
                if (result.status === 'rejected') {
                  const platformMap = {
                    0: 'eBay (Account 2)',
                    1: 'eBay (Account 3)',
                    2: 'WooCommerce',
                    3: 'Walmart (API Update)'
                  };
                  const platformName = platformMap[index] || 'Unknown Platform';
                  console.warn(`${platformName} inventory update failed for SKU ${sku}:`, result.reason?.message || result.reason);
                }
              });
            });
          } catch (platformError) {
            console.warn(`Error during concurrent platform updates for SKU ${sku}:`, platformError.message);
          }

        } else {
          console.warn(`Product with SKU ${sku} not found or stockQuantity is null in local database for Walmart order ${order.purchaseOrderId}.`);
        }
      }
    }

    return newOrders;
  } catch (error) {
    console.error(
      "❌ Error syncing Walmart orders:",
      error.response?.data || error.message || error
    );
    throw new Error("Walmart order sync failed.");
  }
}






// 🚚 2. Update inventory for a single SKU
async function updateWalmartInventory(sku, quantity, shipNode = null) {
  const token = await getValidAccessToken();
  const correlationId = uuidv4();
  const url = new URL(`${BASE_URL}/inventory`);
  url.searchParams.append("sku", sku);
  if (shipNode) url.searchParams.append("shipNode", shipNode);

  try {
    const res = await axios.put(
      url.toString(),
      { sku, quantity: { amount: quantity, unit: "EACH" } },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "WM_SVC.NAME": "Walmart Marketplace",
          "WM_QOS.CORRELATION_ID": correlationId,
          "WM_SEC.ACCESS_TOKEN": token,
        },
      }
    );
    console.log(`✅ Inventory updated (SKU: ${sku}):`, res.data);
    return res.data;
  } catch (err) {
    console.error("❌ Inventory update error:", err.response?.data || err.message);
    throw err;
  }
}

// 📤 3. Upload full-item feed (bulk JSON feed)
async function uploadItemFeed(feedFilePath) {
  const token = await getValidAccessToken();
  const correlationId = uuidv4();
  const json = fs.readFileSync(feedFilePath, "utf-8");

  try {
    const res = await axios.post(
      `${BASE_URL}/feeds?feedType=item`,
      json,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "WM_SVC.NAME": "Walmart Marketplace",
          "WM_QOS.CORRELATION_ID": correlationId,
          "WM_SEC.ACCESS_TOKEN": token,
          "WM_MARKET": "us",
        },
      }
    );
    console.log("✅ Feed uploaded:", res.data);
    if (res.data.feedId) await checkFeedStatus(res.data.feedId, token);
    return res.data;
  } catch (err) {
    console.error("❌ Feed upload error:", err.response?.data || err.message);
    throw err;
  }
}

// 🔍 4. Check feed processing status
async function checkFeedStatus(feedId, token) {
  const correlationId = uuidv4();
  try {
    const res = await axios.get(
      `${BASE_URL}/feeds/${feedId}`,
      {
        headers: {
          Accept: "application/json",
          "WM_SVC.NAME": "Walmart Marketplace",
          "WM_QOS.CORRELATION_ID": correlationId,
          "WM_SEC.ACCESS_TOKEN": token,
          "WM_MARKET": "us",
        },
      }
    );
    console.log("📦 Feed status:", res.data.feedStatus);
    return res.data;
  } catch (err) {
    console.error("❌ Feed status error:", err.response?.data || err.message);
    throw err;
  }
}



module.exports = {
  walmartItemUpdate,
  walmartOrderSync,
};
