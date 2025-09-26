const axios = require("axios");
const querystring = require("querystring");

const { PrismaClient } = require("@prisma/client");

const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

const prisma = new PrismaClient();

const WALMART_AUTH_URL = "https://marketplace.walmartapis.com/v3/token";
const WALMART_ITEMS_URL =
  "https://marketplace.walmartapis.com/v3/feeds?feedType=ITEM";
const CLIENT_ID = process.env.WALMART_CLIENT_ID;
const CLIENT_SECRET = process.env.WALMART_CLIENT_SECRET;

const CLIENT2_ID = process.env.WALMART2_CLIENT_ID;
const CLIENT2_SECRET = process.env.WALMART2_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiration = 0;

/**
 * 1️⃣ Get a New Access Token
 */
async function getNewAccessToken() {
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
async function listWalmartProduct() {
  try {
    const access_token = await getValidAccessToken(); // Your token fetch logic

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

// for wallmart2

async function getNewAccessToken2() {
  try {
    const response = await axios.post(
      WALMART_AUTH_URL,
      querystring.stringify({ grant_type: "client_credentials" }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${CLIENT2_ID}:${CLIENT2_SECRET}`
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
      where: { platform: "WALMART2" }, // Check if an entry for "WALLMART" exists
      update: {
        accessToken: response.data.access_token,
        refreshToken: response.data.access_token,
        expiresAt: expiresAt,
      }, // Update if found
      create: {
        platform: "WALMART2",
        accessToken: response.data.access_token,
        refreshToken: response.data.access_token,
        expiresAt: expiresAt,
      }, // Create if not found
    });

    console.log("✅ Walmart2 Access Token Updated");
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
async function getValidAccessToken2() {
  const token = await prisma.apiToken.findUnique({
    where: {
      platform: "WALMART2",
    },
  });
  if (token?.accessToken && Date.now() < token?.expiresAt) {
    return token.accessToken;
  }
  return await getNewAccessToken2();
}

/**
 * 3️⃣ List a Product on Walmart
 */
async function listWalmartProduct2() {
  try {
    const access_token = await getValidAccessToken2(); // Your token fetch logic

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

module.exports = {
  listWalmartProduct,
  getNewAccessToken,
  getValidAccessToken,
  listWalmartProduct2,
  getNewAccessToken2,
  getValidAccessToken2,
};
