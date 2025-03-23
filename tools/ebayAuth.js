const axios = require("axios");
const querystring = require("querystring");
require("dotenv").config();
const eBayApi = require("ebay-api");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const EBAY_AUTH_URL = "https://auth.sandbox.ebay.com/oauth2/authorize";
const EBAY_TOKEN_URL = "https://api.sandbox.ebay.com/identity/v1/oauth2/token";

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;
const EBAY_REDIRECT_URI = process.env.EBAY_REDIRECT_URI;

//PRODUCTION_KEYS!!!
// const EBAY_AUTH_URL = "https://auth.ebay.com/oauth2/authorize";
// const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";

// const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID_PRODUCTION;
// const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET_PRODUCTION;
// const EBAY_REDIRECT_URI = process.env.EBAY_REDIRECT_URI_PRODUCTION;

// const eBay = new eBayApi({
//   appId: EBAY_CLIENT_ID,
//   certId: EBAY_CLIENT_SECRET,
//   sandbox: true,
//   siteId: eBayApi.SiteId.EBAY_US,
//   ruName: EBAY_REDIRECT_URI,
// });

// 1️⃣ Redirect User to eBay for Login
function getEbayAuthUrl() {
  const params = {
    client_id: EBAY_CLIENT_ID,
    response_type: "code",
    redirect_uri: EBAY_REDIRECT_URI,
  };

  return `${EBAY_AUTH_URL}?${querystring.stringify(params)}`;
}

// Get New Access Token Using Auth Code
async function getAccessToken(authCode) {
  console.log("getAccessToken");
  const authHeader = `Basic ${Buffer.from(
    `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`
  ).toString("base64")}`;

  console.log(authCode);
  console.log(authHeader);
  console.log(EBAY_TOKEN_URL);

  try {
    // Making the POST request to get the access token
    const response = await axios.post(
      EBAY_TOKEN_URL,
      querystring.stringify({
        grant_type: "authorization_code",
        code: authCode,
        redirect_uri: EBAY_REDIRECT_URI,
        scope:
          "https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/buy.order.readonly https://api.ebay.com/oauth/api_scope/buy.guest.order https://api.ebay.com/oauth/api_scope/sell.marketing.readonly https://api.ebay.com/oauth/api_scope/sell.marketing https://api.ebay.com/oauth/api_scope/sell.inventory.readonly https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account.readonly https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.analytics.readonly https://api.ebay.com/oauth/api_scope/sell.marketplace.insights.readonly https://api.ebay.com/oauth/api_scope/commerce.catalog.readonly https://api.ebay.com/oauth/api_scope/buy.shopping.cart https://api.ebay.com/oauth/api_scope/buy.offer.auction https://api.ebay.com/oauth/api_scope/commerce.identity.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.email.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.phone.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.address.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.name.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.status.readonly https://api.ebay.com/oauth/api_scope/sell.finances https://api.ebay.com/oauth/api_scope/sell.payment.dispute https://api.ebay.com/oauth/api_scope/sell.item.draft https://api.ebay.com/oauth/api_scope/sell.item https://api.ebay.com/oauth/api_scope/sell.reputation https://api.ebay.com/oauth/api_scope/sell.reputation.readonly https://api.ebay.com/oauth/api_scope/commerce.notification.subscription https://api.ebay.com/oauth/api_scope/commerce.notification.subscription.readonly https://api.ebay.com/oauth/api_scope/sell.stores https://api.ebay.com/oauth/api_scope/sell.stores.readonly",
      }),
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 90000,
      }
    );

    const expiresAt = new Date(Date.now() + response.data.expires_in * 1000); // Convert to Date object

    const ebayApiData = await prisma.apiToken.upsert({
      where: { platform: "EBAY" }, // Check if an entry for "EBAY" exists
      update: {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: expiresAt,
      }, // Update if found
      create: {
        platform: "EBAY",
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: expiresAt,
      }, // Create if not found
    });

    console.log(ebayApiData);

    console.log(ebayApiData);

    return response.data;
  } catch (error) {
    console.log("error");
    console.log(error);
    // Log the error response from eBay
    if (error.response) {
      // eBay returned an error (e.g., invalid code, expired token, etc.)
      console.error("Error response from eBay:", error.response.data);
      console.error("Error status from eBay:", error.response.status);
    } else if (error.request) {
      // Request was made, but no response was received
      console.error("No response received:", error.request);
    } else {
      // Something else went wrong
      console.error("Error during request setup:", error.message);
    }

    throw new Error("Failed to get access token from eBay");
  }
}

// async function getAccessToken(authCode) {
//   //   const authCode2 = decodeURIComponent(authCode);

//   const token = await eBay.oAuth2.getToken(authCode);
//   console.log(token);
//   return token;
// }

// Use Refresh Token to Get a New Access Token
async function refreshAccessToken() {
  const refreshToken = await prisma.apiToken.findUnique({
    where: {
      platform: "EBAY",
    },
  });

  if (!refreshToken) {
    throw new Error("No refresh token found");
  }

  const authHeader = `Basic ${Buffer.from(
    `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`
  ).toString("base64")}`;

  const response = await axios.post(
    EBAY_TOKEN_URL,
    querystring.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken.refreshToken,
      scope:
        "https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/buy.order.readonly https://api.ebay.com/oauth/api_scope/buy.guest.order https://api.ebay.com/oauth/api_scope/sell.marketing.readonly https://api.ebay.com/oauth/api_scope/sell.marketing https://api.ebay.com/oauth/api_scope/sell.inventory.readonly https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account.readonly https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.analytics.readonly https://api.ebay.com/oauth/api_scope/sell.marketplace.insights.readonly https://api.ebay.com/oauth/api_scope/commerce.catalog.readonly https://api.ebay.com/oauth/api_scope/buy.shopping.cart https://api.ebay.com/oauth/api_scope/buy.offer.auction https://api.ebay.com/oauth/api_scope/commerce.identity.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.email.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.phone.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.address.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.name.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.status.readonly https://api.ebay.com/oauth/api_scope/sell.finances https://api.ebay.com/oauth/api_scope/sell.payment.dispute https://api.ebay.com/oauth/api_scope/sell.item.draft https://api.ebay.com/oauth/api_scope/sell.item https://api.ebay.com/oauth/api_scope/sell.reputation https://api.ebay.com/oauth/api_scope/sell.reputation.readonly https://api.ebay.com/oauth/api_scope/commerce.notification.subscription https://api.ebay.com/oauth/api_scope/commerce.notification.subscription.readonly https://api.ebay.com/oauth/api_scope/sell.stores https://api.ebay.com/oauth/api_scope/sell.stores.readonly",
    }),
    {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);
  try {
    const tokenUpdate = await prisma.apiToken.update({
      where: { platform: "EBAY" },
      data: {
        platform: "EBAY",
        accessToken: response.data.access_token,
        refreshToken: refreshToken.refreshToken,
        expiresAt: expiresAt,
      },
    });
  } catch (error) {
    res.status(500).send(error);
  }

  return response.data.access_token;
}

// Get a Valid Access Token (Refresh if Needed)
async function getValidAccessToken() {
  const token = await prisma.apiToken.findUnique({
    where: {
      platform: "EBAY",
    },
  });
  if (token.accessToken && Date.now() < token.expiresAt) {
    return token.accessToken;
  }
  return await refreshAccessToken();
}

module.exports = {
  getEbayAuthUrl,
  getAccessToken,
  refreshAccessToken,
  getValidAccessToken,
};
