const axios = require("axios");
const querystring = require("querystring");
require("dotenv").config(); // Ensure this is at the very top
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// --- Configuration Variables ---
// IMPORTANT: These should ideally be loaded from process.env for easy switching
// but for now, we'll hardcode them to SANDBOX as you're debugging this.

// Replace these with the SANDBOX URLs
const EBAY_AUTH_URL = "https://auth.sandbox.ebay.com/oauth2/authorize";
const EBAY_TOKEN_URL = "https://api.sandbox.ebay.com/identity/v1/oauth2/token";
const EBAY_API_BASE_URL = "https://api.sandbox.ebay.com"; // Fixed variable name consistency

// Your Sandbox Client ID and Secret (as provided by you)
const EBAY_CLIENT_ID = "BrandSto-BrandSto-PRD-60e716b3d-0515ea65";
const EBAY_CLIENT_SECRET = "PRD-0e716b3dc5b7-c922-44a3-aa29-3613";
const EBAY_REDIRECT_URI = "https://69cf-103-87-213-127.ngrok-free.app/ebay/auth/callback";

// You'll also need sandbox policy IDs for testing inventory APIs
// You might need to create these for your test user in the Sandbox environment
const EBAY_PAYMENT_POLICY_ID = process.env.EBAY_PAYMENT_POLICY_ID_SANDBOX || "YOUR_SANDBOX_PAYMENT_POLICY_ID";
const EBAY_RETURN_POLICY_ID = process.env.EBAY_RETURN_POLICY_ID_SANDBOX || "YOUR_SANDBOX_RETURN_POLICY_ID";
const EBAY_FULFILLMENT_POLICY_ID = process.env.EBAY_FULFILLMENT_POLICY_ID_SANDBOX || "YOUR_SANDBOX_FULFILLMENT_POLICY_ID";

/**
 * 1️⃣ Redirect User to eBay for Login
 * Generates the eBay authentication URL.
 * @returns {string} The eBay authorization URL.
 */
function getEbayAuthUrl() {
  const params = {
    client_id: EBAY_CLIENT_ID,
    response_type: "code",
    redirect_uri: EBAY_REDIRECT_URI,
    // Ensure these scopes are valid for Sandbox too. They usually are.
    scope:
      "https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/buy.order.readonly https://api.ebay.com/oauth/api_scope/buy.guest.order https://api.ebay.com/oauth/api_scope/sell.marketing.readonly https://api.ebay.com/oauth/api_scope/sell.marketing https://api.ebay.com/oauth/api_scope/sell.inventory.readonly https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account.readonly https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.analytics.readonly https://api.ebay.com/oauth/api_scope/sell.marketplace.insights.readonly https://api.ebay.com/oauth/api_scope/commerce.catalog.readonly https://api.ebay.com/oauth/api_scope/buy.shopping.cart https://api.ebay.com/oauth/api_scope/buy.offer.auction https://api.ebay.com/oauth/api_scope/commerce.identity.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.email.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.phone.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.address.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.name.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.status.readonly https://api.ebay.com/oauth/api_scope/sell.finances https://api.ebay.com/oauth/api_scope/sell.payment.dispute https://api.ebay.com/oauth/api_scope/sell.item.draft https://api.ebay.com/oauth/api_scope/sell.item https://api.ebay.com/oauth/api_scope/sell.reputation https://api.ebay.com/oauth/api_scope/sell.reputation.readonly https://api.ebay.com/oauth/api_scope/commerce.notification.subscription https://api.ebay.com/oauth/api_scope/commerce.notification.subscription.readonly https://api.ebay.com/oauth/api_scope/sell.stores https://api.ebay.com/oauth/api_scope/sell.stores.readonly",
  };

  return `${EBAY_AUTH_URL}?${querystring.stringify(params)}`;
}

/**
 * Gets a new access token using an authorization code.
 * @param {string} authCode The authorization code obtained from eBay.
 * @returns {Object} The response data containing access token, refresh token, and expiry.
 * @throws {Error} If the request to eBay fails.
 */
async function getAccessToken(authCode) {
  console.log("Attempting to get access token...");
  const authHeader = `Basic ${Buffer.from(
    `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`
  ).toString("base64")}`;

  try {
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

    const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);

    const ebayApiData = await prisma.apiToken.upsert({
      where: { platform: "EBAY" },
      update: {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: expiresAt,
      },
      create: {
        platform: "EBAY",
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: expiresAt,
      },
    });

    console.log("Access token successfully obtained and saved:", ebayApiData);
    return response.data;
  } catch (error) {
    console.error("Error getting access token from eBay:");
    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error status:", error.response.status);
    } else if (error.request) {
      console.error("No response received from eBay:", error.request);
    } else {
      console.error("Error during request setup:", error.message);
    }
    throw new Error("Failed to get access token from eBay.");
  }
}

/**
 * Uses a refresh token to get a new access token.
 * @returns {string} The new access token.
 * @throws {Error} If no refresh token is found or the refresh fails.
 */
async function refreshAccessToken() {
  console.log("Attempting to refresh access token...");
  const refreshTokenData = await prisma.apiToken.findUnique({
    where: {
      platform: "EBAY",
    },
  });

  if (!refreshTokenData || !refreshTokenData.refreshToken) {
    throw new Error("No refresh token found for eBay. User needs to re-authenticate.");
  }

  const authHeader = `Basic ${Buffer.from(
    `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`
  ).toString("base64")}`;
  console.log("Attempting to refresh with token ending in:", refreshTokenData.refreshToken.slice(-10));

  try {
    const response = await axios.post(
      EBAY_TOKEN_URL,
      querystring.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshTokenData.refreshToken,
        // Use a minimal scope for refresh to avoid issues
        scope: "https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment",
      }),
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 30000,
      }
    );

    const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);
    const tokenUpdate = await prisma.apiToken.update({
      where: { platform: "EBAY" },
      data: {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || refreshTokenData.refreshToken,
        expiresAt: expiresAt,
      },
    });
    console.log("Access token refreshed successfully");
    return response.data.access_token;
  } catch (error) {
    console.error("Error refreshing access token:", error.response?.data || error.message);
    
    // Handle specific eBay refresh token errors
    if (error.response?.data?.error === 'invalid_grant') {
      console.error("Refresh token is invalid or expired. Clearing token data...");
      
      // Clear the invalid token from database
      await prisma.apiToken.delete({
        where: { platform: "EBAY" },
      }).catch(deleteError => {
        console.error("Error clearing invalid token:", deleteError);
      });
      
      throw new Error("REFRESH_TOKEN_EXPIRED: User needs to re-authenticate with eBay.");
    }
    
    throw new Error(`Failed to refresh access token from eBay: ${error.response?.data?.error_description || error.message}`);
  }
}

/**
 * Gets a valid eBay access token, refreshing it if it's expired.
 * @returns {string} A valid eBay access token.
 * @throws {Error} If no token is found or refreshing fails.
 */
async function getValidAccessToken() {
  const token = await prisma.apiToken.findUnique({
    where: {
      platform: "EBAY",
    },
  });

  if (!token) {
    throw new Error("AUTHENTICATION_REQUIRED: No eBay API token found in the database. Please authenticate first.");
  }

  // Check if the current token is still valid (add a 5-minute buffer for safety)
  if (token.accessToken && new Date(token.expiresAt).getTime() > Date.now() + 5 * 60 * 1000) {
    console.log("Using existing valid eBay access token.");
    return token.accessToken;
  }

  console.log("eBay access token expired or expires soon, attempting to refresh.");
  
  try {
    return await refreshAccessToken();
  } catch (error) {
    // If refresh fails due to invalid refresh token, clear the token and require re-auth
    if (error.message.includes('REFRESH_TOKEN_EXPIRED')) {
      throw new Error("AUTHENTICATION_REQUIRED: Refresh token expired. Please re-authenticate with eBay.");
    }
    throw error;
  }
}

/**
 * Creates a product on eBay through their Inventory API.
 * This function orchestrates the steps: fetching category aspects, creating the inventory item,
 * creating an offer, and publishing the listing.
 * @param {Object} productData - An object containing product details.
 * @param {string} productData.title - The title of the product.
 * @param {string} productData.sku - The SKU (Stock Keeping Unit) of the product.
 * @param {number} productData.quantity - The available quantity of the product.
 * @param {number} productData.price - The price of the product.
 * @param {string} [productData.categoryId="155201"] - The eBay category ID. Defaults to "155201".
 * @param {string} [productData.description=""] - The product description.
 * @param {string} [productData.brand="Generic"] - The brand of the product.
 * @param {string[]} [productData.imageUrls=[]] - An array of image URLs for the product.
 * @param {string} [productData.condition="NEW"] - The condition of the product (e.g., "NEW", "USED_GOOD").
 * @param {string} [productData.color=""] - The color of the product.
 * @param {string} [productData.size=""] - The size of the product.
 * @param {string} [productData.type=""] - The type of the product.
 * @returns {Object} An object indicating success and the eBay offer ID.
 * @throws {Error} If any step in the product creation process fails.
 */
async function createEbayProduct(productData) {
  try {
    const token = await getValidAccessToken();
    if (!token) {
      throw new Error("Failed to obtain a valid eBay token.");
    }

    const ebayCategoryId = productData.categoryId || "155201"; // Default category if not provided

    // 1. Fetch category aspects from eBay API
    const aspects = await fetchCategoryAspects(token, ebayCategoryId);
    console.log("Fetched category aspects:", aspects);

    // 2. Create inventory item
    await createInventoryItem(token, productData, aspects);
    console.log(`Inventory item created for SKU: ${productData.sku}`);

    // 3. Create offer for listing
    const offerId = await createOffer(token, productData, ebayCategoryId);
    console.log(`Offer created with ID: ${offerId}`);

    // 4. Publish the listing
    await publishListing(token, offerId);
    console.log(`Listing published for offer ID: ${offerId}`);

    return {
      success: true,
      message: "Product created and published successfully on eBay.",
      offerId,
    };
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    console.error("Error creating eBay product:", JSON.stringify(errorDetails, null, 2));
    throw new Error(
      `Failed to create product on eBay: ${JSON.stringify(error.response?.data || error.message)}`
    );
  }
}

/**
 * Fetches category aspects from eBay API for a given category ID.
 * @param {string} token - Valid eBay API token.
 * @param {string} categoryId - eBay category ID.
 * @returns {Object} A processed aspects object, suitable for eBay inventory item creation.
 */
async function fetchCategoryAspects(token, categoryId) {
  const excludedAspects = ["size", "brand", "color", "style", "type", "condition"]; // Add 'condition' to excluded if you handle it separately

  try {
    const response = await axios.get(
      `${EBAY_API_BASE_URL}/commerce/taxonomy/v1/category_tree/0/get_item_aspects_for_category?category_id=${categoryId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US",
        },
      }
    );

    // Process and filter aspects
    return response.data.aspects.reduce((acc, value) => {
      const name = value.localizedAspectName?.toLowerCase();
      if (!name || excludedAspects.includes(name)) return acc;

      // For aspects that are required but you don't have a specific value,
      // use a placeholder like "N/A" or "Other" instead of 'ㅤ'.
      // Double-check eBay's documentation for acceptable values for empty/generic aspects.
      return { ...acc, [value.localizedAspectName]: ["N/A"] };
    }, {});
  } catch (error) {
    console.error("Error fetching category aspects:", error.response?.data || error.message);
    // Return empty aspects object if there's an error, allowing the process to continue
    // but without dynamic aspects.
    return {};
  }
}

/**
 * Creates an inventory item on eBay.
 * @param {string} token - Valid eBay API token.
 * @param {Object} productData - Product data from request.
 * @param {Object} aspects - Processed category aspects.
 * @returns {Promise} Result of the API call.
 */
async function createInventoryItem(token, productData, aspects) {
  const {
    title,
    sku,
    quantity,
    size,
    type,
    description,
    brand,
    imageUrls,
    condition,
    color,
    mpn, // Make MPN dynamic if possible
  } = productData;

  const productAspects = { ...aspects };
  if (color) productAspects.Color = [color];
  if (size) productAspects.Size = [size];
  if (brand) productAspects.Brand = [brand];
  if (type) productAspects.Type = [type];
  if (productData.style) productAspects.Style = [productData.style]; // Add style if available

  return axios.put(
    `${EBAY_API_BASE_URL}/sell/inventory/v1/inventory_item/${sku}`,
    {
      product: {
        title,
        description: description || "Product description will be updated soon.",
        brand: brand || "Generic", // Default to Generic if not provided
        aspects: productAspects,
        imageUrls: imageUrls && imageUrls.length > 0 ? imageUrls : ["https://via.placeholder.com/300"],
        ean: [], // Populate if you have EANs
        mpn: mpn || "NOTAPPLICABLE", // Use a dynamic MPN or a standard placeholder
        upc: [], // Populate if you have UPCs
      },
      availability: {
        shipToLocationAvailability: {
          availabilityDistributions: [
            {
              availabilityType: "IN_STOCK",
              fulfillmentTime: {
                unit: "BUSINESS_DAY",
                value: 2,
              },
              merchantLocationKey: "warehouse-1", // Updated merchant location key
              quantity,
            },
          ],
          quantity,
        },
      },
      condition: condition || "NEW", // Default condition
      conditionDescription: "Brand new item in excellent condition", // Customize as needed
      packageWeightAndSize: { // Consider making this dynamic based on product data
        weight: {
          unit: "KILOGRAM",
          value: 1, // Default weight
        },
        shippingIrregular: false,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Language": "en-US",
      },
    }
  );
}

/**
 * Creates an offer for the inventory item on eBay.
 * @param {string} token - Valid eBay API token.
 * @param {Object} productData - Product data from request.
 * @param {string} categoryId - eBay category ID.
 * @returns {string} The eBay offer ID.
 */
async function createOffer(token, productData, categoryId) {
  const { sku, quantity, price, listingDescription } = productData;

  const response = await axios.post(
    `${EBAY_API_BASE_URL}/sell/inventory/v1/offer`,
    {
      sku,
      marketplaceId: "EBAY_US",
      categoryId,
      format: "FIXED_PRICE",
      listingDuration: "GTC", // Good 'Til Cancelled
      listingDescription: listingDescription || `<h1>${productData.title}</h1><p>A great product for you!</p>`, // Make dynamic
      availableQuantity: quantity,
      quantityLimitPerBuyer: 2, // Consider making this configurable
      listingPolicies: {
        paymentPolicyId: EBAY_PAYMENT_POLICY_ID,
        returnPolicyId: EBAY_RETURN_POLICY_ID,
        fulfillmentPolicyId: EBAY_FULFILLMENT_POLICY_ID,
      },
      pricingSummary: {
        price: {
          currency: "USD",
          value: price,
        },
      },
      // You can add more offer details here if needed, e.g., taxes, shipping costs.
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Language": "en-US",
      },
    }
  );

  return response.data.offerId;
}

/**
 * Publishes the offer (listing) on eBay.
 * @param {string} token - Valid eBay API token.
 * @param {string} offerId - eBay offer ID to publish.
 * @returns {Promise} Result of the API call.
 */
async function publishListing(token, offerId) {
  return axios.post(
    `${EBAY_API_BASE_URL}/sell/inventory/v1/offer/${offerId}/publish`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Language": "en-US",
      },
    }
  );
}

/**
 * Checks if user needs to re-authenticate with eBay
 * @returns {boolean} True if user needs to re-authenticate
 */
async function needsReauthentication() {
  try {
    await getValidAccessToken();
    return false;
  } catch (error) {
    return error.message.includes('AUTHENTICATION_REQUIRED');
  }
}

module.exports = {
  getEbayAuthUrl,
  getAccessToken,
  refreshAccessToken,
  getValidAccessToken,
  createEbayProduct,
  needsReauthentication,
};