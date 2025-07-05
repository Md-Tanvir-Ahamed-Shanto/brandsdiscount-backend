const axios = require("axios");
const querystring = require("querystring");
require("dotenv").config();
const { PrismaClient, Platform } = require("@prisma/client");
const prisma = new PrismaClient();

// --- CONFIGURATION (SANDBOX) ---
const EBAY_AUTH_URL = "https://auth.ebay.com/oauth2/authorize";
const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_API_BASE_URL = "https://api.ebay.com";

const EBAY3_CLIENT_ID = process.env.EBAY3_CLIENT_ID;
const EBAY3_CLIENT_SECRET = process.env.EBAY3_CLIENT_SECRET;
const EBAY3_REDIRECT_URI = process.env.EBAY3_REDIRECT_URI;

// 🔑 Get Authorization URL
function getEbayAuthUrl3() {
  const scope = [
    "https://api.ebay.com/oauth/api_scope",
    "https://api.ebay.com/oauth/api_scope/sell.inventory",
    "https://api.ebay.com/oauth/api_scope/sell.account",
    "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  ].join(" ");

  const params = {
    client_id: EBAY3_CLIENT_ID,
    response_type: "code",
    redirect_uri: EBAY3_REDIRECT_URI,
    scope,
  };

  return `${EBAY_AUTH_URL}?${querystring.stringify(params)}`;
}

// 🎫 Get Access Token (after login)
async function getAccessToken3(authCode) {
  const authHeader = `Basic ${Buffer.from(
    `${EBAY3_CLIENT_ID}:${EBAY3_CLIENT_SECRET}`
  ).toString("base64")}`;

  try {
    const response = await axios.post(
      EBAY_TOKEN_URL,
      querystring.stringify({
        grant_type: "authorization_code",
        code: authCode,
        redirect_uri: EBAY3_REDIRECT_URI,
      }),
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);
    console.log("New eBay access token update database: ", response.data);
    await prisma.apiToken.upsert({
      where: { platform: Platform.EBAY3 },
      update: {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt,
      },
      create: {
        platform: Platform.EBAY3,
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Access token error:", error.response?.data || error.message);
    throw new Error("Failed to get access token.");
  }
}

// 🔄 Refresh Token (without scope)
async function refreshAccessToken3() {
  const refreshTokenData = await prisma.apiToken.findUnique({
    where: { platform: Platform.EBAY3 },
  });

  if (!refreshTokenData?.refreshToken)
    throw new Error("Missing refresh token.");

  const authHeader = `Basic ${Buffer.from(
    `${EBAY3_CLIENT_ID}:${EBAY3_CLIENT_SECRET}`
  ).toString("base64")}`;

  try {
    const response = await axios.post(
      EBAY_TOKEN_URL,
      querystring.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshTokenData.refreshToken,
      }),
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("Try to get refreshAccessToekn response: ", response.data);

    const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);
    await prisma.apiToken.update({
      where: { platform: Platform.EBAY3 },
      data: {
        accessToken: response.data.access_token,
        refreshToken:
          response.data.refresh_token || refreshTokenData.refreshToken,
        expiresAt,
      },
    });

    return response.data.access_token;
  } catch (error) {
    console.log(
      "Error in refreshAccessToken: ",
      error.response?.data || error.message
    );
    if (error.response?.data?.error === "invalid_grant") {
      // await prisma.apiToken
      //   .delete({ where: { platform: Platform.EBAY3 } })
      //   .catch(() => {});
      throw new Error(
        "REFRESH_TOKEN_EXPIRED: User needs to re-authenticate with eBay."
      );
    }

    throw new Error(error.response?.data?.error_description || error.message);
  }
}

// ✅ Get valid access token (refresh if needed)
async function getValidAccessToken3() {
  const token = await prisma.apiToken.findUnique({
    where: { platform: Platform.EBAY3 },
  });

  if (!token) throw new Error("AUTHENTICATION_REQUIRED");

  const isExpired =
    new Date(token.expiresAt).getTime() <= Date.now() + 5 * 60 * 1000;
  if (!isExpired) return token.accessToken;

  return await refreshAccessToken3();
}

module.exports = {
  getEbayAuthUrl3,
  getAccessToken3,
  refreshAccessToken3,
  getValidAccessToken3,
};
