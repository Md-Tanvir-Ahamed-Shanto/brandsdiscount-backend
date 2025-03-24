const axios = require("axios");
const querystring = require("querystring");
const { getAccessToken } = require("./ebayAuth");

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const WALMART_AUTH_URL = "https://marketplace.walmartapis.com/v3/token";
const WALMART_ITEMS_URL =
  "https://sandbox.walmartapis.com/v3/feeds?feedType=ITEM";
const CLIENT_ID = process.env.WALMART_CLIENT_ID;
const CLIENT_SECRET = process.env.WALMART_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiration = 0;

/**
 * 1️⃣ Get a New Access Token
 */
async function getNewAccessToken() {
  console.log("basic");
  console.log(Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"));
  try {
    const response = await axios.post(
      WALMART_AUTH_URL,
      querystring.stringify({ grant_type: "client_credentials" }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${CLIENT_ID}:${CLIENT_SECRET}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "WM_SVC.NAME": "Walmart Marketplace",
          "WM_QOS.CORRELATION_ID": "290554c7-caaa-4f2d-ada6-572b3b7fca88",
        },
      }
    );

    const { access_token, expires_in } = response.data;
    cachedToken = access_token;
    const expiresAt = new Date(Date.now() + expires_in * 1000); // Convert to Date object

    const apiData = await prisma.apiToken.upsert({
      where: { platform: "WALMART" }, // Check if an entry for "WALLMART" exists
      update: {
        accessToken: response.data.access_token,
        refreshToken: response.data.access_token,
        expiresAt: expiresAt,
      }, // Update if found
      create: {
        platform: "WALMART",
        accessToken: response.data.access_token,
        refreshToken: response.data.access_token,
        expiresAt: expiresAt,
      }, // Create if not found
    });

    console.log("✅ Walmart Access Token Updated");
    return cachedToken;
  } catch (error) {
    console.error(
      "❌ Error refreshing Walmart token:",
      error.response?.data || error.message
    );
    return null;
  }
}

/**
 * 2️⃣ Get a Valid Access Token
 */
// Get a Valid Access Token (Refresh if Needed)
async function getValidAccessToken() {
  const token = await prisma.apiToken.findUnique({
    where: {
      platform: "WALMART",
    },
  });
  if (token?.accessToken && Date.now() < token?.expiresAt) {
    return token.accessToken;
  }
  return await getNewAccessToken();
}

/**
 * 3️⃣ List a Product on Walmart
 */
async function listWalmartProduct(productData) {
  //productData is a json file attached
  try {
    const access_token = await getValidAccessToken();
    if (!access_token) throw new Error("Failed to obtain access token");

    const response = await axios.post(WALMART_ITEMS_URL, productData, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/xml",
        Accept: "application/json",
      },
    });

    console.log("✅ Product Listing Submitted:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Error listing product:",
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
          const updateProduct = await prisma.product.update({
            where: {
              sku: item.item.sku,
            },
            data: {
              stockQuantity:
                productData.stockQuantity - item.orderLineQuantity.amount,
            },
          });
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
  listWalmartProduct,
  getNewAccessToken,
  getValidAccessToken,
  walmartOrderSync,
  walmartItemUpdate,
};
