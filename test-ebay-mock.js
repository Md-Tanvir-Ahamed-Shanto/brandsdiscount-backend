const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const { getValidAccessToken2 } = require("../tools/ebayAuth2");
const { getValidAccessToken3 } = require("../tools/ebayAuth3");
const { getValidAccessToken } = require("../tools/ebayAuth");
const prisma = new PrismaClient();

// Create a custom axios instance with increased timeout
const ebayAxios = axios.create({
  timeout: 60000, // 60 seconds timeout instead of 30 seconds
});

// Helper function to add retry logic
async function retryOperation(operation, maxRetries = 3, delay = 5000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed. Retrying in ${delay/1000} seconds...`);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

const EBAY_API_BASE_URL = "https://api.ebay.com";

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

async function createEbayProduct(product) {
  try {
    console.log(
      `Starting eBay product creation for SKU: ${product.sku || "unknown"}`
    );
    const token = await getValidAccessToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Content-Language": "en-US",
    };

    // Truncate title to 80 characters for eBay requirements
    const title = (product.title || "Untitled Product").substring(0, 80);
    const brandName = "Generic Brand";
    const images = product.images || [];
    const sku = product.sku || `SKU-${Date.now()}`;
    const regularPrice = product.regularPrice || 0;
    const stockQuantity = product.stockQuantity || 0;
    const description = product.description || "";
    const categoryId = product.categoryId || "53159";
    const size = product.size || "M";
    const sizeType = product.sizeType || "Regular";
    const type = product.type || "T-Shirt";
    const department = product.department || "Men's Clothing";
    const color = product.color || "Red";

    console.log(`eBay1: Creating inventory item for SKU: ${sku}`);
    // Step 1: Create or update inventory item with retry logic
    await retryOperation(async () => {
      await ebayAxios.put(
        `${EBAY_API_BASE_URL}/sell/inventory/v1/inventory_item/${sku}`,
        {
          availability: {
            shipToLocationAvailability: {
              quantity: stockQuantity || 0,
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

    console.log(`eBay1: Waiting for inventory item to be processed for SKU: ${sku}`);
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay

    console.log(`eBay1: Creating offer for SKU: ${sku}`);
    const resolvedPolicies1 = await resolveListingPolicies(getValidAccessToken, "EBAY");
    // Step 2: Create offer with retry logic
    const offerResp = await retryOperation(async () => {
      const response = await ebayAxios.post(
        `${EBAY_API_BASE_URL}/sell/inventory/v1/offer`,
        {
          sku,
          marketplaceId: "EBAY_US",
          format: "FIXED_PRICE",
          availableQuantity: stockQuantity || 0,
          pricingSummary: {
            price: {
              currency: "USD",
              value: (regularPrice || 0).toFixed(2),
            },
          },
          listingPolicies: {
            fulfillmentPolicyId: resolvedPolicies1.fulfillmentPolicyId,
            paymentPolicyId: resolvedPolicies1.paymentPolicyId,
            returnPolicyId: resolvedPolicies1.returnPolicyId,
          },
          categoryId: categoryId,
          merchantLocationKey: process.env.EBAY_LOCATION_KEY || "warehouse1",
          listingDescription: description,
        },
        { headers }
      );
      return response;
    });

    const offerId = offerResp.data.offerId;

    console.log(`eBay1: Publishing offer ${offerId} for SKU: ${sku}`);
    // Step 3: Publish offer with retry logic
    await retryOperation(async () => {
      await ebayAxios.post(
        `${EBAY_API_BASE_URL}/sell/inventory/v1/offer/${offerId}/publish`,
        {},
        { headers }
      );
    });

    console.log(`✅ Created and published eBay product: ${sku}`);
    return { success: true, sku, offerId };
  } catch (error) {
    console.error(
      `❌ Error creating eBay product:`,
      error.response?.data || error.message
    );
    throw error;
  }
}

async function createEbayProduct2(product) {
  try {
    console.log(
      `Starting eBay2 product creation for SKU: ${product.sku || "unknown"}`
    );
    const token = await getValidAccessToken2();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Content-Language": "en-US",
    };

    // Truncate title to 80 characters for eBay requirements
    const title = (product.title || "Untitled Product").substring(0, 80);
    const brandName = "Generic Brand";
    const images = product.images || [];
    const sku = product.sku || `SKU-${Date.now()}`;
    const regularPrice = product.regularPrice || 0;
    const stockQuantity = product.stockQuantity || 0;
    const description = product.description || "";
    const categoryId = product.categoryId || "53159";
    const size = product.size || "M";
    const sizeType = product.sizeType || "Regular";
    const type = product.type || "T-Shirt";
    const department = product.department || "Men's Clothing";
    const color = product.color || "Red";

    console.log(`eBay2: Creating inventory item for SKU: ${sku}`);
    // Step 1: Create or update inventory item with retry logic
    await retryOperation(async () => {
      await ebayAxios.put(
        `${EBAY_API_BASE_URL}/sell/inventory/v1/inventory_item/${sku}`,
        {
          availability: {
            shipToLocationAvailability: {
              quantity: stockQuantity || 0,
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
    
    // Add a delay to ensure inventory item is fully processed before creating offer
    console.log(`eBay2: Waiting for inventory item to be processed for SKU: ${sku}`);
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay

    console.log(`eBay2: Creating offer for SKU: ${sku}`);
    const resolvedPolicies2 = await resolveListingPolicies(getValidAccessToken2, "EBAY2");
    // Step 2: Create offer with retry logic
    const offerResp = await retryOperation(async () => {
      const response = await ebayAxios.post(
        `${EBAY_API_BASE_URL}/sell/inventory/v1/offer`,
        {
          sku,
          marketplaceId: "EBAY_US",
          format: "FIXED_PRICE",
          availableQuantity: stockQuantity || 0,
          pricingSummary: {
            price: {
              currency: "USD",
              value: (regularPrice || 0).toFixed(2),
            },
          },
          listingPolicies: {
            fulfillmentPolicyId: resolvedPolicies2.fulfillmentPolicyId,
            paymentPolicyId: resolvedPolicies2.paymentPolicyId,
            returnPolicyId: resolvedPolicies2.returnPolicyId,
          },
          categoryId: categoryId,
          merchantLocationKey: process.env.EBAY2_LOCATION_KEY || "warehouse1",
          listingDescription: description,
        },
        { headers }
      );
      return response;
    });

    const offerId = offerResp.data.offerId;

    console.log(`eBay2: Publishing offer ${offerId} for SKU: ${sku}`);
    // Step 3: Publish offer with retry logic
    await retryOperation(async () => {
      await ebayAxios.post(
        `${EBAY_API_BASE_URL}/sell/inventory/v1/offer/${offerId}/publish`,
        {},
        { headers }
      );
    });

    console.log(`✅ Created and published eBay2 product: ${sku}`);
    return { success: true, sku, offerId };
  } catch (error) {
    console.error(
      `❌ Error creating eBay2 product:`,
      error.response?.data || error.message
    );
    throw error;
  }
}

async function createEbayProduct3(product) {
  try {
    console.log(
      `Starting eBay3 product creation for SKU: ${product.sku || "unknown"}`
    );
    const token = await getValidAccessToken3();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Content-Language": "en-US",
    };

    // Truncate title to 80 characters for eBay requirements
    const title = (product.title || "Untitled Product").substring(0, 80);
    const brandName = "Generic Brand";
    const images = product.images || [];
    const sku = product.sku || `SKU-${Date.now()}`;
    const regularPrice = product.regularPrice || 0;
    const stockQuantity = product.stockQuantity || 0;
    const description = product.description || "";
    const categoryId = product.categoryId || "53159";
    const size = product.size || "M";
    const sizeType = product.sizeType || "Regular";
    const type = product.type || "T-Shirt";
    const department = product.department || "Men's Clothing";
    const color = product.color || "Red";

    console.log(`eBay3: Creating inventory item for SKU: ${sku}`);
    // Step 1: Create or update inventory item with retry logic
    await retryOperation(async () => {
      await ebayAxios.put(
        `${EBAY_API_BASE_URL}/sell/inventory/v1/inventory_item/${sku}`,
        {
          availability: {
            shipToLocationAvailability: {
              quantity: stockQuantity || 0,
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
    
    // Add a delay to ensure inventory item is fully processed before creating offer
    console.log(`eBay3: Waiting for inventory item to be processed for SKU: ${sku}`);
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
    
    console.log(`eBay3: Creating offer for SKU: ${sku}`);
    const resolvedPolicies3 = await resolveListingPolicies(getValidAccessToken3, "EBAY3");
    // Step 2: Create offer with retry logic
    const offerResp = await retryOperation(async () => {
      const response = await ebayAxios.post(
        `${EBAY_API_BASE_URL}/sell/inventory/v1/offer`,
        {
          sku,
          marketplaceId: "EBAY_US",
          format: "FIXED_PRICE",
          availableQuantity: stockQuantity || 0,
          pricingSummary: {
            price: {
              currency: "USD",
              value: (regularPrice || 0).toFixed(2),
            },
          },
          listingPolicies: {
            fulfillmentPolicyId: resolvedPolicies3.fulfillmentPolicyId,
            paymentPolicyId: resolvedPolicies3.paymentPolicyId,
            returnPolicyId: resolvedPolicies3.returnPolicyId,
          },
          categoryId: categoryId,
          merchantLocationKey: process.env.EBAY3_LOCATION_KEY || "warehouse1",
          listingDescription: description,
        },
        { headers }
      );
      return response;
    });

    const offerId = offerResp.data.offerId;

    console.log(`eBay3: Publishing offer ${offerId} for SKU: ${sku}`);
    // Step 3: Publish offer with retry logic
    await retryOperation(async () => {
      await ebayAxios.post(
        `${EBAY_API_BASE_URL}/sell/inventory/v1/offer/${offerId}/publish`,
        {},
        { headers }
      );
    });

    console.log(`✅ Created and published eBay3 product: ${sku}`);
    return { success: true, sku, offerId };
  } catch (error) {
    console.error(
      `❌ Error creating eBay3 product:`,
      error.response?.data || error.message
    );
    throw error;
  }
}

module.exports = { createEbayProduct, createEbayProduct2, createEbayProduct3 };
