const axios = require('axios');
const CryptoJS = require('crypto-js'); // Make sure you have this installed: npm install crypto-js
const prisma = require('../../db/connection'); // Assuming your Prisma setup
const crypto = require('crypto'); // Built-in Node.js crypto module

const SHEIN_API_CONFIG = {
  APP_ID: process.env.SHEIN_APP_ID, // Ensure these are correctly set in your .env
  APP_SECRET: process.env.SHEIN_APP_SECRET, // Make sure this is the correct appSecretKey
  REDIRECT_URI: process.env.SHEIN_REDIRECT_URI, // Relevant for OAuth flow
  BASE_AUTH_URL: "https://auth.sheincorp.com", // Relevant for OAuth flow
  BASE_API_URL: "https://open.sheincorp.com", // Base URL for Open API calls
};

/**
 * Retrieves valid Shein API tokens (openKeyId and encryptedSecretKey) from the database.
 * Assumes 'accessToken' in DB stores 'openKeyId' and 'refreshToken' stores 'encryptedSecretKey'.
 */
async function getValidAccessToken(platformEnum) {
  try {
    const tokenRecord = await prisma.apiToken.findUnique({
      where: {
        platform: platformEnum,
      },
    });

    if (!tokenRecord) {
      // In a real application, you might want to trigger a re-authorization here
      throw new Error(`No API token found for platform: ${platformEnum}. Please authorize first.`);
    }

    return {
      openKeyId: tokenRecord.accessToken,       // Storing openKeyId in accessToken column
      encryptedSecretKey: tokenRecord.refreshToken, // Storing encrypted secretKey in refreshToken column
      expiresAt: tokenRecord.expiresAt,
    };
  } catch (error) {
    console.error(`Error getting valid access token for ${platformEnum}:`, error.message);
    throw error;
  }
}

/**
 * Generates the Shein authorization URL for merchants to authorize your application.
 * This is the first step in the OAuth flow to get the tempToken.
 */
function generateSheinAuthUrl(state) {
  const encodedRedirectUri = Buffer.from(SHEIN_API_CONFIG.REDIRECT_URI).toString('base64');
  const authUrl = `${SHEIN_API_CONFIG.BASE_AUTH_URL}/#/empower?appid=${SHEIN_API_CONFIG.APP_ID}&redirectUrl=${encodedRedirectUri}&state=${state}`;
  return authUrl;
}

/**
 * Generates the signature specifically for the /open-api/auth/get-by-token endpoint.
 * According to documentation, it uses appId and appSecretKey.
 * The common format for this specific token exchange signature is:
 * HMAC-SHA256(APP_SECRET, "appid" + APP_ID + "appSecret" + APP_SECRET + "timestamp" + TIMESTAMP)
 * Output is typically uppercase hex.
 */
function generateTokenExchangeSignature(appId, appSecret, timestamp) {
  // Construct the string to be signed as specified by Shein's token exchange rules
  const signString = `appid${appId}appSecret${appSecret}timestamp${timestamp}`;
  console.log("String to sign for get-by-token:", signString); // For debugging

  // Compute the HMAC-SHA256 hash and convert to uppercase hex string
  const signature = CryptoJS.HmacSHA256(signString, appSecret).toString(CryptoJS.enc.Hex).toUpperCase();
  return signature;
}

/**
 * Exchanges a tempToken (obtained from merchant authorization) for Shein's openKeyId and secretKey.
 * This function now adheres strictly to the provided Shein API documentation for this endpoint.
 * @param {string} tempToken The temporary token received after merchant authorization.
 */
async function exchangeSheinTempToken(tempToken) {
  if (!tempToken) {
    throw new Error("tempToken is required for Shein token exchange.");
  }

  const appId = SHEIN_API_CONFIG.APP_ID;
  const appSecret = SHEIN_API_CONFIG.APP_SECRET;
  const path = "/open-api/auth/get-by-token"; // The actual API path
  const timestamp = Date.now().toString(); // Unix timestamp in milliseconds

  // Generate the signature specific to this token exchange endpoint
  const signature = generateTokenExchangeSignature(appId, appSecret, timestamp);

  try {
    const url = `${SHEIN_API_CONFIG.BASE_API_URL}${path}`;
    const headers = {
      "Content-Type": "application/json;charset=UTF-8",
      "x-lt-appid": appId,
      "x-lt-timestamp": timestamp,
      "x-lt-signature": signature,
      // IMPORTANT: x-lt-rand is NOT included here as it's not listed in the documentation
      // for this specific /get-by-token endpoint's request headers.
    };

    const payload = {
      tempToken: tempToken, // This is the CORRECT request body as per documentation
    };

    console.log("--- Shein Token Exchange Request Details ---");
    console.log("URL:", url);
    console.log("Headers:", headers);
    console.log("Payload:", payload);
    console.log("Generated Signature (for request):", signature);
    console.log("------------------------------------------");


    const response = await axios.post(url, payload, { headers });

    // Extracting openKeyId and secretKey from the 'info' object in the response
    const openKeyId = response.data?.info?.openKeyId;
    const encryptedSecretKey = response.data?.info?.secretKey; // This is the encrypted secretKey, not the appSecret

    if (!openKeyId || !encryptedSecretKey) {
      throw new Error("Failed to obtain Shein openKeyId or secretKey from token exchange. Response: " + JSON.stringify(response.data));
    }

    // Store the obtained openKeyId and encryptedSecretKey in your database
    await prisma.apiToken.upsert({
      where: { platform: "SHEIN" },
      update: {
        accessToken: openKeyId,       // Mapping openKeyId to accessToken column
        refreshToken: encryptedSecretKey, // Mapping encryptedSecretKey to refreshToken column
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Example: Valid for 1 year
      },
      create: {
        platform: "SHEIN",
        accessToken: openKeyId,
        refreshToken: encryptedSecretKey,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    console.log("✅ Shein Token Exchange Success!");
    return { openKeyId, encryptedSecretKey };
  } catch (error) {
    console.error(
      "❌ Error exchanging Shein temporary token:",
      error.response?.data || error.message,
      error.response?.status ? `(HTTP Status: ${error.response.status})` : ''
    );
    throw new Error("Shein temporary token exchange failed.");
  }
}

/**
 * Provides the necessary credentials (openKeyId and the encrypted secretKey) for making
 * subsequent general Shein API calls.
 */
async function getValidSheinApiCredentials() {
  const sheinTokens = await getValidAccessToken("SHEIN");
  if (!sheinTokens.openKeyId || !sheinTokens.encryptedSecretKey) {
    throw new Error("Shein credentials (openKeyId or encryptedSecretKey) not found or invalid in DB.");
  }
  return {
    openKeyId: sheinTokens.openKeyId,
    secretKey: sheinTokens.encryptedSecretKey, // This is the encrypted secretKey from Shein
  };
}

/**
 * Generates the signature for general Shein Open API requests (NOT the get-by-token endpoint).
 * This typically involves openKeyId, the encrypted secretKey, the API path, timestamp, and a randomKey.
 * This signature format is different from the token exchange signature.
 * The randomKey is prepended to the Base64 encoded HMAC-SHA256 hash.
 */
function generateSheinApiSignature(openKeyId, encryptedSecretKey, timestamp, path, randomKey) {
  // Value to be hashed: concatenation of openKeyId, timestamp, and API path, separated by '&'
  const value = `${openKeyId}&${timestamp}&${path}`;
  // Key for HMAC: concatenation of encryptedSecretKey and randomKey
  const key = `${encryptedSecretKey}${randomKey}`;

  // Compute HMAC-SHA256 and convert to hex string
  const hmacResult = CryptoJS.HmacSHA256(value, key).toString(CryptoJS.enc.Hex);
  // Base64 encode the hex string
  const base64Signature = Buffer.from(hmacResult, 'hex').toString('base64');
  
  // The final signature is randomKey + Base64 signature
  return `${randomKey}${base64Signature}`;
}

module.exports = {
  getValidAccessToken,
  generateSheinAuthUrl,
  exchangeSheinTempToken,
  getValidSheinApiCredentials,
  generateSheinApiSignature,
  SHEIN_API_CONFIG,
};