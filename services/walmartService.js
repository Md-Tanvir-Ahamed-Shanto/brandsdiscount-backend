const axios = require("axios");

const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const { getValidAccessToken } = require("../tools/wallmartAuth");
const prisma = require("../db/connection");
const { v4: uuidv4 } = require("uuid");

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
      "WM_SEC.ACCESS_TOKEN": token, // Replace with actual token
      "WM_SVC.NAME": "Walmart Marketplace",
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const response = await axios.put(url, updateData, { headers });
  } catch (error) {
    console.error(
      "Walmart Inventory Update Error:",
      error.response?.data || error.message
    );
  }
}

async function walmartOrderSync() {
  const token = await getValidAccessToken();

  try {
    const now = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // Subtract 5 minutes and convert to ISO

    const url = `https://marketplace.walmartapis.com/v3/orders?status=Created&productInfo=false&limit=100&shipNodeType=SellerFulfilled&replacementInfo=false`;
    // const url = `https://marketplace.walmartapis.com/v3/orders?status=Created&productInfo=false&shipNodeType=SellerFulfilled&replacementInfo=false&createdStartDate=${encodeURIComponent(
    //   now
    // )}`;

    const headers = {
      "WM_QOS.CORRELATION_ID": "790554c7-caaa-4f2d-ada6-572b3b7fca88",
      "WM_SEC.ACCESS_TOKEN": token, // Replace with actual token
      "WM_SVC.NAME": "Walmart Marketplace",
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const response = await axios.get(url, { headers });
    const data = response.data;
    const existingOrders = await prisma.walmartOrder.findMany();
    console.log("exisitng orders", existingOrders);
    const newOrders = data.list.elements.order.filter(
      (order) =>
        !existingOrders.find(
          (existing) => existing.orderId === order.purchaseOrderId
        )
    );

    console.log(`new ordersssss`, newOrders);

    const clearDB = await prisma.walmartOrder.deleteMany({});
    const createOrders = await prisma.walmartOrder.createMany({
      data: newOrders.map((order) => ({
        orderId: order.purchaseOrderId,
        orderCreationDate: new Date(order.orderDate),
      })),
    });
    console.log(`new ordersssss222222`, newOrders);

    newOrders.forEach(async (order) => {
      order.orderLines.orderLine.forEach(async (item) => {
        console.log("syncing order:", order);
        console.log("stock order:", item.item.sku);
        console.log("Quantity order:", item.orderLineQuantity.amount);
        const productData = await prisma.product.findUnique({
          where: {
            sku: item.item.sku,
          },
        });
        if (productData) {
         console.log("Product found:", productData.sku);
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
  listWalmartProduct,
  walmartOrderSync,
};
