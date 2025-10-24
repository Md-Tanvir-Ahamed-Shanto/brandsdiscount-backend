const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const { getValidAccessToken2 } = require("../tools/ebayAuth2");
const { getValidAccessToken3 } = require("../tools/ebayAuth3");
const { getValidAccessToken } = require("../tools/ebayAuth");
const { createNotification } = require("../utils/notification");
const prisma = new PrismaClient();

// Create a custom axios instance with optimized timeout
const ebayAxios = axios.create({
  timeout: 90000, // 90 seconds timeout for eBay API operations
});

// Helper function to categorize eBay errors for better error handling
function categorizeEbayError(error) {
  const errorMessage = error.response?.data?.errors?.[0]?.message || error.message;
  const statusCode = error.response?.status;
  const errorCode = error.response?.data?.errors?.[0]?.errorId;

  // Network/Connection errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return {
      category: 'TIMEOUT_ERROR',
      code: 'EBAY_TIMEOUT',
      message: 'eBay API request timed out. Please try again.',
      details: { originalError: errorMessage, timeout: true }
    };
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return {
      category: 'NETWORK_ERROR',
      code: 'EBAY_NETWORK',
      message: 'Unable to connect to eBay API. Please check your internet connection.',
      details: { originalError: errorMessage, network: true }
    };
  }

  // Authentication errors
  if (statusCode === 401 || errorMessage?.includes('token') || errorMessage?.includes('auth')) {
    return {
      category: 'AUTH_ERROR',
      code: 'EBAY_AUTH',
      message: 'eBay authentication failed. Please check your API credentials.',
      details: { originalError: errorMessage, statusCode }
    };
  }

  // Rate limiting
  if (statusCode === 429 || errorCode === '21919') {
    return {
      category: 'RATE_LIMIT_ERROR',
      code: 'EBAY_RATE_LIMIT',
      message: 'eBay API rate limit exceeded. Please wait before trying again.',
      details: { originalError: errorMessage, statusCode, errorCode }
    };
  }

  // Validation errors
  if (statusCode === 400) {
    return {
      category: 'VALIDATION_ERROR',
      code: 'EBAY_VALIDATION',
      message: `eBay validation error: ${errorMessage}`,
      details: { originalError: errorMessage, statusCode, errorCode }
    };
  }

  // Server errors
  if (statusCode >= 500) {
    return {
      category: 'SERVER_ERROR',
      code: 'EBAY_SERVER',
      message: 'eBay server error. Please try again later.',
      details: { originalError: errorMessage, statusCode }
    };
  }

  // Specific eBay error codes
  const ebayErrorCodes = {
    '25002': 'Invalid category ID',
    '25003': 'Invalid listing policy',
    '25004': 'Invalid inventory item',
    '25005': 'Duplicate SKU',
    '25006': 'Invalid offer data'
  };

  if (errorCode && ebayErrorCodes[errorCode]) {
    return {
      category: 'EBAY_SPECIFIC_ERROR',
      code: `EBAY_${errorCode}`,
      message: ebayErrorCodes[errorCode],
      details: { originalError: errorMessage, statusCode, errorCode }
    };
  }

  // Default error
  return {
    category: 'UNKNOWN_ERROR',
    code: 'EBAY_UNKNOWN',
    message: errorMessage || 'Unknown eBay API error occurred',
    details: { originalError: errorMessage, statusCode, errorCode }
  };
}

// Helper function to create standardized eBay response
function createEbayResponse(success, platform, data = null, error = null) {
  const response = {
    success,
    platform,
    timestamp: new Date().toISOString()
  };

  if (success && data) {
    response.data = data;
  }

  if (!success && error) {
    response.error = error;
  }

  return response;
}

const EBAY_API_BASE_URL = "https://api.ebay.com";

// Global required fields for eBay product creation
const GLOBAL_REQUIRED_FIELDS = [
  "Brand", 
  "Color", 
  "Department", 
  "Designer/Brand", 
  "Dress Length", 
  "Inseam", 
  "Outer Shell Material", 
  "Size", 
  "Size Type", 
  "Skirt Length", 
  "Sleeve Length", 
  "Style", 
  "Type", 
  "US Shoe Size", 
  "Upper Material"
];

/**
 * Prepares product aspects for eBay listing using global required fields
 * @param {Object} globalRequiredFields - Fields provided from frontend
 * @returns {Array} Array of product aspects for eBay
 */
function prepareProductAspects(globalRequiredFields = {}) {
  const aspects = [];
  
  // Define meaningful default values for required fields
  const defaultValues = {
    "Brand": "Unbranded",
    "Color": "Multi-Color",
    "Department": "Unisex",
    "Designer/Brand": "Unbranded",
    "Dress Length": "Not Applicable",
    "Inseam": "Not Applicable",
    "Outer Shell Material": "Not Specified",
    "Size": "One Size",
    "Size Type": "Regular",
    "Skirt Length": "Not Applicable",
    "Sleeve Length": "Not Applicable",
    "Style": "Casual",
    "Type": "Not Specified",
    "US Shoe Size": "Not Applicable",
    "Upper Material": "Not Specified"
  };
  
  GLOBAL_REQUIRED_FIELDS.forEach(fieldName => {
    const value = globalRequiredFields[fieldName] || defaultValues[fieldName] || "Not Specified";
    aspects.push({
      name: fieldName,
      values: [value]
    });
  });
  
  return aspects;
}

async function createEbayProduct(product, globalRequiredFields = {}) {
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
    const images = product.images || [];
    const sku = product.sku || `SKU-${Date.now()}`;
    const regularPrice = product.regularPrice || 0;
    const stockQuantity = product.stockQuantity || 0;
    const description = product.description || "";
    const categoryId = product.categoryId || "53159";
    
    // Prepare dynamic aspects using global required fields
    const aspects = {};
    const dynamicAspects = prepareProductAspects(globalRequiredFields);
    dynamicAspects.forEach(aspect => {
      aspects[aspect.name] = aspect.values;
    });
    
    // Add MPN as it's always required
    aspects["MPN"] = ["Does not apply"];

    console.log(`eBay1: Creating inventory item for SKU: ${sku}`);
    // Step 1: Create or update inventory item (single attempt)
    try {
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
            aspects: aspects,
            imageUrls: images,
          },
        },
        { headers }
      );
    } catch (inventoryError) {
      const categorizedError = categorizeEbayError(inventoryError);
      
      // Create notification for inventory creation failure
      try {
        await createNotification({
          title: "eBay Inventory Creation Failed",
          message: `Failed to create inventory for SKU: ${sku}. Error: ${categorizedError.message}`,
          location: "eBay Account 1",
          selledBy: product.selledBy || "EBAY1"
        });
      } catch (notificationError) {
        console.error("Failed to create notification for inventory creation failure:", notificationError);
      }
      
      return createEbayResponse(false, "eBay1", null, {
        ...categorizedError,
        step: "inventory_creation",
        sku
      });
    }

    console.log(`eBay1: Waiting for inventory item to be processed for SKU: ${sku}`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Reduced to 2 second delay

    console.log(`eBay1: Creating offer for SKU: ${sku}`);
    // Step 2: Create offer (single attempt)
    let offerResp;
    try {
      offerResp = await ebayAxios.post(
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
            fulfillmentPolicyId: process.env.EBAY_FULFILLMENT_POLICY_ID,
            paymentPolicyId: process.env.EBAY_PAYMENT_POLICY_ID,
            returnPolicyId: process.env.EBAY_RETURN_POLICY_ID,
          },
          categoryId: categoryId,
          merchantLocationKey: "warehouse1",
          listingDescription: description,
        },
        { headers }
      );
    } catch (offerError) {
      const categorizedError = categorizeEbayError(offerError);
      
      // Create notification for offer creation failure
      try {
        await createNotification({
          title: "eBay Offer Creation Failed",
          message: `Failed to create offer for SKU: ${sku}. Error: ${categorizedError.message}`,
          location: "eBay Account 1",
          selledBy: product.selledBy || "EBAY1"
        });
      } catch (notificationError) {
        console.error("Failed to create notification for offer creation failure:", notificationError);
      }
      
      return createEbayResponse(false, "eBay1", null, {
        ...categorizedError,
        step: "offer_creation",
        sku
      });
    }

    const offerId = offerResp.data.offerId;

    console.log(`eBay1: Publishing offer ${offerId} for SKU: ${sku}`);
    // Step 3: Publish offer (single attempt)
    try {
      await ebayAxios.post(
        `${EBAY_API_BASE_URL}/sell/inventory/v1/offer/${offerId}/publish`,
        {},
        { headers }
      );
    } catch (publishError) {
      const categorizedError = categorizeEbayError(publishError);
      
      // Create notification for publishing failure
      try {
        await createNotification({
          title: "eBay Publishing Failed",
          message: `Failed to publish offer for SKU: ${sku}. Error: ${categorizedError.message}`,
          location: "eBay Account 1",
          selledBy: product.selledBy || "EBAY1"
        });
      } catch (notificationError) {
        console.error("Failed to create notification for publishing failure:", notificationError);
      }
      
      return createEbayResponse(false, "eBay1", null, {
        ...categorizedError,
        step: "offer_publishing",
        sku,
        offerId
      });
    }

    console.log(`✅ Created and published eBay product: ${sku}`);
    
    return createEbayResponse(true, "eBay1", {
      sku, 
      offerId,
      message: `Successfully created and published product on eBay1`
    });
  } catch (error) {
    console.error(`❌ Error creating eBay product:`, error.message);
    const categorizedError = categorizeEbayError(error);
    return createEbayResponse(false, "eBay1", null, {
      ...categorizedError,
      step: "general_error",
      sku: product.sku
    });
  }
}

async function createEbayProduct2(product, globalRequiredFields = {}) {
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
    const images = product.images || [];
    const sku = product.sku || `SKU-${Date.now()}`;
    const regularPrice = product.regularPrice || 0;
    const stockQuantity = product.stockQuantity || 0;
    const description = product.description || "";
    const categoryId = product.categoryId || "53159";
    
    // Prepare dynamic aspects using global required fields
    const aspects = {};
    const dynamicAspects = prepareProductAspects(globalRequiredFields);
    dynamicAspects.forEach(aspect => {
      aspects[aspect.name] = aspect.values;
    });
    
    // Add MPN as it's always required
    aspects["MPN"] = ["Does not apply"];

    console.log(`eBay2: Creating inventory item for SKU: ${sku}`);
    // Step 1: Create or update inventory item (single attempt)
    try {
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
            aspects: aspects,
            imageUrls: images,
          },
        },
        { headers }
      );
    } catch (inventoryError) {
      const categorizedError = categorizeEbayError(inventoryError);
      
      // Create notification for inventory creation failure
      try {
        await createNotification({
          title: "eBay2 Inventory Creation Failed",
          message: `Failed to create inventory for SKU: ${sku}. Error: ${categorizedError.message}`,
          location: "eBay Account 2",
          selledBy: product.selledBy || "EBAY1"
        });
      } catch (notificationError) {
        console.error("Failed to create notification for inventory creation failure:", notificationError);
      }
      
      return createEbayResponse(false, "eBay2", null, {
        ...categorizedError,
        step: "inventory_creation",
        sku
      });
    }
    
    // Add a delay to ensure inventory item is fully processed before creating offer
    console.log(`eBay2: Waiting for inventory item to be processed for SKU: ${sku}`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Reduced to 2 second delay

    console.log(`eBay2: Creating offer for SKU: ${sku}`);
    // Step 2: Create offer (single attempt)
    let offerResp;
    try {
      offerResp = await ebayAxios.post(
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
            fulfillmentPolicyId: process.env.EBAY2_FULFILLMENT_POLICY_ID,
            paymentPolicyId: process.env.EBAY2_PAYMENT_POLICY_ID,
            returnPolicyId: process.env.EBAY2_RETURN_POLICY_ID
          },
          categoryId: categoryId,
          merchantLocationKey: "warehouse1",
          listingDescription: description,
        },
        { headers }
      );
    } catch (offerError) {
      const categorizedError = categorizeEbayError(offerError);
      
      // Create notification for offer creation failure
      try {
        await createNotification({
          title: "eBay2 Offer Creation Failed",
          message: `Failed to create offer for SKU: ${sku}. Error: ${categorizedError.message}`,
          location: "eBay Account 2",
          selledBy: product.selledBy || "EBAY2"
        });
      } catch (notificationError) {
        console.error("Failed to create notification for offer creation failure:", notificationError);
      }
      
      return createEbayResponse(false, "eBay2", null, {
        ...categorizedError,
        step: "offer_creation",
        sku
      });
    }

    const offerId = offerResp.data.offerId;

    console.log(`eBay2: Publishing offer ${offerId} for SKU: ${sku}`);
    // Step 3: Publish offer (single attempt)
    try {
      await ebayAxios.post(
        `${EBAY_API_BASE_URL}/sell/inventory/v1/offer/${offerId}/publish`,
        {},
        { headers }
      );
    } catch (publishError) {
      const categorizedError = categorizeEbayError(publishError);
      
      // Create notification for publishing failure
      try {
        await createNotification({
          title: "eBay2 Publishing Failed",
          message: `Failed to publish offer for SKU: ${sku}. Error: ${categorizedError.message}`,
          location: "eBay Account 2",
          selledBy: product.selledBy || "EBAY2"
        });
      } catch (notificationError) {
        console.error("Failed to create notification for publishing failure:", notificationError);
      }
      
      return createEbayResponse(false, "eBay2", null, {
        ...categorizedError,
        step: "offer_publishing",
        sku,
        offerId
      });
    }

    console.log(`✅ Created and published eBay2 product: ${sku}`);
    
    return createEbayResponse(true, "eBay2", {
      sku, 
      offerId,
      message: `Successfully created and published product on eBay2`
    });
  } catch (error) {
    console.error(`❌ Error creating eBay2 product:`, error.message);
    const categorizedError = categorizeEbayError(error);
    return createEbayResponse(false, "eBay2", null, {
      ...categorizedError,
      step: "general_error",
      sku: product.sku
    });
  }
}

async function createEbayProduct3(product, globalRequiredFields = {}) {
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
    const images = product.images || [];
    const sku = product.sku || `SKU-${Date.now()}`;
    const regularPrice = product.regularPrice || 0;
    const stockQuantity = product.stockQuantity || 0;
    const description = product.description || "";
    const categoryId = product.categoryId || "53159";
    
    // Prepare dynamic aspects using global required fields
    const aspects = {};
    const dynamicAspects = prepareProductAspects(globalRequiredFields);
    dynamicAspects.forEach(aspect => {
      aspects[aspect.name] = aspect.values;
    });
    
    // Add MPN as it's always required
    aspects["MPN"] = ["Does not apply"];

    console.log(`eBay3: Creating inventory item for SKU: ${sku}`);
    // Step 1: Create or update inventory item (single attempt)
    try {
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
            aspects: aspects,
            imageUrls: images,
          },
        },
        { headers }
      );
    } catch (inventoryError) {
      const categorizedError = categorizeEbayError(inventoryError);
      
      // Send notification for inventory creation failure
      try {
        await createNotification({
          type: 'error',
          title: 'eBay3 Inventory Creation Failed',
          message: `Failed to create inventory for SKU: ${sku}. Error: ${categorizedError.message}`,
          location: 'eBay3 Inventory Creation',
          selledBy: product.selledBy || "EBAY3",
          metadata: {
            platform: 'eBay3',
            sku: sku,
            step: 'inventory_creation',
            error: categorizedError
          }
        });
      } catch (notificationError) {
        console.error('Failed to create notification for inventory creation failure:', notificationError);
      }
      
      return createEbayResponse(false, "eBay3", null, {
        ...categorizedError,
        step: "inventory_creation",
        sku
      });
    }

    console.log(`eBay3: Waiting for inventory item to be processed for SKU: ${sku}`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Reduced to 2 second delay

    console.log(`eBay3: Creating offer for SKU: ${sku}`);
    // Step 2: Create offer (single attempt)
    let offerResp;
    try {
      offerResp = await ebayAxios.post(
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
            fulfillmentPolicyId: process.env.EBAY3_FULFILLMENT_POLICY_ID,
            paymentPolicyId: process.env.EBAY3_PAYMENT_POLICY_ID,
            returnPolicyId: process.env.EBAY3_RETURN_POLICY_ID,
          },
          categoryId: categoryId,
          merchantLocationKey: "warehouse1",
          listingDescription: description,
        },
        { headers }
      );
    } catch (offerError) {
      const categorizedError = categorizeEbayError(offerError);
      
      // Send notification for offer creation failure
      try {
        await createNotification({
          type: 'error',
          title: 'eBay3 Offer Creation Failed',
          message: `Failed to create offer for SKU: ${sku}. Error: ${categorizedError.message}`,
          location: 'eBay3 Offer Creation',
          selledBy: product.selledBy || "EBAY3",
          metadata: {
            platform: 'eBay3',
            sku: sku,
            step: 'offer_creation',
            error: categorizedError
          }
        });
      } catch (notificationError) {
        console.error('Failed to create notification for offer creation failure:', notificationError);
      }
      
      return createEbayResponse(false, "eBay3", null, {
        ...categorizedError,
        step: "offer_creation",
        sku
      });
    }

    const offerId = offerResp.data.offerId;

    console.log(`eBay3: Publishing offer ${offerId} for SKU: ${sku}`);
    // Step 3: Publish offer (single attempt)
    try {
      await ebayAxios.post(
        `${EBAY_API_BASE_URL}/sell/inventory/v1/offer/${offerId}/publish`,
        {},
        { headers }
      );
    } catch (publishError) {
      const categorizedError = categorizeEbayError(publishError);
      
      // Send notification for publishing failure
      try {
        await createNotification({
          type: 'error',
          title: 'eBay3 Publishing Failed',
          message: `Failed to publish offer ${offerId} for SKU: ${sku}. Error: ${categorizedError.message}`,
          location: 'eBay3 Publishing',
          selledBy: product.selledBy || "EBAY3",
          metadata: {
            platform: 'eBay3',
            sku: sku,
            offerId: offerId,
            step: 'offer_publishing',
            error: categorizedError
          }
        });
      } catch (notificationError) {
        console.error('Failed to create notification for publishing failure:', notificationError);
      }
      
      return createEbayResponse(false, "eBay3", null, {
        ...categorizedError,
        step: "offer_publishing",
        sku,
        offerId
      });
    }

    console.log(`✅ Created and published eBay3 product: ${sku}`);
    
    return createEbayResponse(true, "eBay3", {
      sku, 
      offerId,
      message: `Successfully created and published product on eBay3`
    });
  } catch (error) {
    console.error(`❌ Error creating eBay3 product:`, error.message);
    const categorizedError = categorizeEbayError(error);
    return createEbayResponse(false, "eBay3", null, {
      ...categorizedError,
      step: "general_error",
      sku: product.sku
    });
  }
}

module.exports = { createEbayProduct, createEbayProduct2, createEbayProduct3 };
