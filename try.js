const { default: axios } = require("axios");

let ebayAccessToken = null;
let accessTokenExpiry = 0;

const getEbayAccessToken = async (refreshToken) => {
  if (ebayAccessToken && accessTokenExpiry > Date.now() + 60000) {
    return ebayAccessToken;
  }

  try {
    const clientId = "BrandSto-BrandSto-PRD-60e716b3d-0515ea65";
    const clientSecret = "PRD-0e716b3dc5b7-c922-44a3-aa29-3613";
    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await axios.post(
      "https://api.ebay.com/identity/v1/oauth2/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope:
          "https://api.ebay.com/oauth/api_scope/sell.inventory " +
          "https://api.ebay.com/oauth/api_scope/sell.fulfillment " +
          "https://api.ebay.com/oauth/api_scope/sell.account " +
          "https://api.ebay.com/oauth/api_scope/sell.marketing",
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${authString}`,
        },
      }
    );

    console.log("Access Token Response:", response.data);
    ebayAccessToken = response.data.access_token;
    accessTokenExpiry = Date.now() + response.data.expires_in * 1000;
    return ebayAccessToken;
  } catch (error) {
    console.error(
      "Failed to get access token:",
      error.response ? JSON.stringify(error.response.data, null, 2) : error.message
    );
  }
};

// Use your production refresh token:
getEbayAccessToken("v^1.1#i^1#p^3#r^1#f^0#I^3#t^Ul4xMF85OkIyMjJDNzRGNUMzRDVCQzBFNjQwQjczODg3NjZFOTA0XzFfMSNFXjI2MA=="); // replace with full token
