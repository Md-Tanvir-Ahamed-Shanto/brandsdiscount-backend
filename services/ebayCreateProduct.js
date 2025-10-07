const axios = require("axios");
const { getValidAccessToken2 } = require("../tools/ebayAuth2");
const { getValidAccessToken3 } = require("../tools/ebayAuth3");
const { getValidAccessToken } = require("../tools/ebayAuth");

// Constants
const EBAY_API_BASE_URL = "https://api.ebay.com";
const DEFAULT_TIMEOUT = 60000; // 60 seconds
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 5000; // 5 seconds
const INVENTORY_PROCESSING_DELAY = 5000; // 5 seconds
const TITLE_MAX_LENGTH = 80;
const DEFAULT_CATEGORY_ID = "53159";
const DEFAULT_BRAND = "Generic Brand";

// Create a custom axios instance with increased timeout
const ebayAxios = axios.create({
  timeout: DEFAULT_TIMEOUT,
});

// Helper function to add retry logic with smart error detection
async function retryOperation(operation, maxRetries = DEFAULT_MAX_RETRIES, delay = DEFAULT_RETRY_DELAY) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx except 429 - rate limiting)
      const status = error.response?.status;
      if (status && status >= 400 && status < 500 && status !== 429) {
        console.log(`Non-retryable error (${status}). Aborting retry attempts.`);
        throw error;
      }
      
      console.log(`Attempt ${attempt} failed. ${attempt < maxRetries ? `Retrying in ${delay/1000} seconds...` : 'Max retries reached.'}`);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Validate product input
function validateProduct(product) {
  const errors = [];
  
  if (!product || typeof product !== 'object') {
    throw new Error('Product must be a valid object');
  }
  
  if (!product.sku) {
    errors.push('SKU is required');
  }
  
  if (!product.title || product.title.trim() === '') {
    errors.push('Title is required');
  }
  
  if (product.regularPrice === undefined || product.regularPrice === null || product.regularPrice < 0) {
    errors.push('Valid regular price (>= 0) is required');
  }
  
  if (product.stockQuantity !== undefined && product.stockQuantity < 0) {
    errors.push('Stock quantity cannot be negative');
  }
  
  if (errors.length > 0) {
    throw new Error(`Product validation failed: ${errors.join(', ')}`);
  }
}

// Helper function to create a return policy if none exists
async function createReturnPolicy(token, envPrefix) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  
  try {
    console.log(`[${envPrefix}] No valid return policy found. Attempting to create one...`);
    
    const response = await ebayAxios.post(
      `${EBAY_API_BASE_URL}/sell/account/v1/return_policy`,
      {
        name: `Default Return Policy ${Date.now()}`,
        marketplaceId: "EBAY_US",
        categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES" }],
        returnsAccepted: true,
        returnPeriod: { value: 30, unit: "DAY" },
        returnMethod: "REPLACEMENT_OR_MONEY_BACK",
        returnShippingCostPayer: "SELLER",
        description: "30-day returns. Seller pays for return shipping."
      },
      { headers }
    );
    
    console.log(`[${envPrefix}] Successfully created return policy: ${response.data.returnPolicyId}`);
    return response.data.returnPolicyId;
  } catch (error) {
    console.error(`[${envPrefix}] Failed to create return policy:`, error.response?.data || error.message);
    return null;
  }
}

// Resolve valid listing policy IDs for the given account
async function resolveListingPolicies(getTokenFn, envPrefix = "EBAY") {
  let token;
  try {
    token = await getTokenFn();
  } catch (error) {
    console.error(`[${envPrefix}] Error getting token: ${error.message}`);
    // Use environment variables as fallback if database is unavailable
    if (process.env[`${envPrefix}_ACCESS_TOKEN`]) {
      console.log(`[${envPrefix}] Using fallback token from environment variables`);
      token = process.env[`${envPrefix}_ACCESS_TOKEN`];
    } else {
      throw error;
    }
  }
  
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const marketplaceId = "EBAY_US";

  const [fulfillmentPolicies, paymentPolicies, returnPolicies] = await Promise.all([
    ebayAxios.get(`${EBAY_API_BASE_URL}/sell/account/v1/fulfillment_policy`, { headers }),
    ebayAxios.get(`${EBAY_API_BASE_URL}/sell/account/v1/payment_policy`, { headers }),
    ebayAxios.get(`${EBAY_API_BASE_URL}/sell/account/v1/return_policy`, { headers }),
  ]);

  const fpList = fulfillmentPolicies.data.fulfillmentPolicies || [];
  const ppList = paymentPolicies.data.paymentPolicies || [];
  const rpList = returnPolicies.data.returnPolicies || [];

  const envFp = process.env[`${envPrefix}_FULFILLMENT_POLICY_ID`];
  const envPp = process.env[`${envPrefix}_PAYMENT_POLICY_ID`];
  const envRp = process.env[`${envPrefix}_RETURN_POLICY_ID`];

  const pickPolicyId = (list, envId, policyType = '') => {
    // First try to use the environment-provided policy ID if it exists and is valid
    if (envId && list.some(p => p.policyId === envId && p.marketplaceId === marketplaceId)) {
      return envId;
    }
    
    // For return policies, prioritize ones that accept returns
    if (policyType === 'return') {
      const validReturnPolicy = list.find(p => 
        p.marketplaceId === marketplaceId && 
        p.returnsAccepted === true
      );
      if (validReturnPolicy) return validReturnPolicy.policyId;
    }
    
    // Fall back to any policy for the marketplace
    const match = list.find(p => p.marketplaceId === marketplaceId);
    return match ? match.policyId : null;
  };

  const fulfillmentPolicyId = pickPolicyId(fpList, envFp, 'fulfillment');
  const paymentPolicyId = pickPolicyId(ppList, envPp, 'payment');
  let returnPolicyId = pickPolicyId(rpList, envRp, 'return');

  // Log the resolved policies for debugging
  console.log(`[${envPrefix}] Using policies: FP=${fulfillmentPolicyId}, PP=${paymentPolicyId}, RP=${returnPolicyId}`);

  // If return policy is missing, try to create one
  if (!returnPolicyId && fulfillmentPolicyId && paymentPolicyId) {
    returnPolicyId = await createReturnPolicy(token, envPrefix);
  }

  if (!fulfillmentPolicyId || !paymentPolicyId || !returnPolicyId) {
    throw new Error(
      `Missing required listing policies for ${envPrefix}. Found - Fulfillment: ${!!fulfillmentPolicyId}, Payment: ${!!paymentPolicyId}, Return: ${!!returnPolicyId}. Please configure policies for ${marketplaceId}.`
    );
  }

  // Log the merchant location key that will be used
  const merchantLocationKey = process.env[`${envPrefix}_LOCATION_KEY`] || "warehouse1";
  console.log(`[${envPrefix}] Using merchantLocationKey: ${merchantLocationKey}`);

  return { fulfillmentPolicyId, paymentPolicyId, returnPolicyId };
}

// Main function to create eBay product - unified for all accounts
async function createEbayProductForAccount(product, accountNumber = 1) {
  // Validate input first
  validateProduct(product);

  // Determine account-specific settings
  const accountPrefix = accountNumber === 1 ? 'EBAY' : `EBAY${accountNumber}`;
  const getTokenFn = accountNumber === 1 ? getValidAccessToken 
                   : accountNumber === 2 ? getValidAccessToken2 
                   : getValidAccessToken3;

  try {
    console.log(`Starting ${accountPrefix} product creation for SKU: ${product.sku}`);
    
    const token = await getTokenFn();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Content-Language": "en-US",
    };

    // Prepare product data with defaults
    const title = (product.title || "Untitled Product").substring(0, TITLE_MAX_LENGTH);
    const brandName = product.brand || DEFAULT_BRAND;
    const images = Array.isArray(product.images) ? product.images : [];
    const sku = product.sku;
    const regularPrice = product.regularPrice || 0;
    const stockQuantity = product.stockQuantity || 0;
    const description = product.description || "";
    const categoryId = product.categoryId || DEFAULT_CATEGORY_ID;
    const size = product.size || "M";
    const sizeType = product.sizeType || "Regular";
    const type = product.type || "T-Shirt";
    const department = product.department || "Men's Clothing";
    const color = product.color || "Red";

    console.log(`${accountPrefix}: Creating inventory item for SKU: ${sku}`);
    
    // Step 1: Create or update inventory item with retry logic
    await retryOperation(async () => {
      await ebayAxios.put(
        `${EBAY_API_BASE_URL}/sell/inventory/v1/inventory_item/${sku}`,
        {
          availability: {
            shipToLocationAvailability: {
              quantity: stockQuantity,
            },
          },
          condition: "NEW",
          product: {
            title: title,
            description: description,
            aspects: {
              Brand: [brandName],
              MPN: ["Does not apply"],
              Size: [size],
              SizeType: [sizeType],
              Type: [type],
              Department: [department],
              Color: [color],
              Style: ["Casual"]
            },
            imageUrls: images,
          },
        },
        { headers }
      );
    });

    // Wait for inventory item to be processed
    console.log(`${accountPrefix}: Waiting for inventory item to be processed for SKU: ${sku}`);
    await new Promise(resolve => setTimeout(resolve, INVENTORY_PROCESSING_DELAY));

    console.log(`${accountPrefix}: Creating offer for SKU: ${sku}`);
    
    // Resolve listing policies
    const resolvedPolicies = await resolveListingPolicies(getTokenFn, accountPrefix);
    
    // Step 2: Create offer with retry logic
    const offerResp = await retryOperation(async () => {
      const response = await ebayAxios.post(
        `${EBAY_API_BASE_URL}/sell/inventory/v1/offer`,
        {
          sku,
          marketplaceId: "EBAY_US",
          format: "FIXED_PRICE",
          availableQuantity: stockQuantity,
          pricingSummary: {
            price: {
              currency: "USD",
              value: regularPrice.toFixed(2),
            },
          },
          listingPolicies: {
            fulfillmentPolicyId: resolvedPolicies.fulfillmentPolicyId,
            paymentPolicyId: resolvedPolicies.paymentPolicyId,
            returnPolicyId: resolvedPolicies.returnPolicyId,
          },
          categoryId: categoryId,
          merchantLocationKey: process.env[`${accountPrefix}_LOCATION_KEY`] || "warehouse1",
          listingDescription: description,
        },
        { headers }
      );
      return response;
    });

    const offerId = offerResp.data.offerId;

    console.log(`${accountPrefix}: Publishing offer ${offerId} for SKU: ${sku}`);
    
    // Step 3: Publish offer with retry logic
    await retryOperation(async () => {
      await ebayAxios.post(
        `${EBAY_API_BASE_URL}/sell/inventory/v1/offer/${offerId}/publish`,
        {},
        { headers }
      );
    });

    console.log(`✅ Created and published ${accountPrefix} product: ${sku}`);
    return { success: true, sku, offerId, account: accountPrefix };
  } catch (error) {
    console.error(
      `❌ Error creating ${accountPrefix} product:`,
      error.response?.data || error.message
    );
    throw error;
  }
}

// Wrapper functions for backward compatibility
async function createEbayProduct(product) {
  return createEbayProductForAccount(product, 1);
}

async function createEbayProduct2(product) {
  return createEbayProductForAccount(product, 2);
}

async function createEbayProduct3(product) {
  return createEbayProductForAccount(product, 3);
}

module.exports = { 
  createEbayProduct, 
  createEbayProduct2, 
  createEbayProduct3,
  createEbayProductForAccount // Export the unified function as well
};