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
    try {
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
    } catch (inventoryError) {
      const errorMessage = inventoryError.response?.data?.errors?.[0]?.message || inventoryError.message;
      throw new Error(`eBay1 inventory creation failed: ${errorMessage}`);
    }

    console.log(`eBay1: Waiting for inventory item to be processed for SKU: ${sku}`);
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay

    console.log(`eBay1: Creating offer for SKU: ${sku}`);
    // Step 2: Create offer with retry logic
    let offerResp;
    try {
      offerResp = await retryOperation(async () => {
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
        return response;
      });
    } catch (offerError) {
      const errorMessage = offerError.response?.data?.errors?.[0]?.message || offerError.message;
      throw new Error(`eBay1 offer creation failed: ${errorMessage}`);
    }

    const offerId = offerResp.data.offerId;

    console.log(`eBay1: Publishing offer ${offerId} for SKU: ${sku}`);
    // Step 3: Publish offer with retry logic
    try {
      await retryOperation(async () => {
        await ebayAxios.post(
          `${EBAY_API_BASE_URL}/sell/inventory/v1/offer/${offerId}/publish`,
          {},
          { headers }
        );
      });
    } catch (publishError) {
      const errorMessage = publishError.response?.data?.errors?.[0]?.message || publishError.message;
      throw new Error(`eBay1 offer publishing failed: ${errorMessage}`);
    }

    console.log(`✅ Created and published eBay product: ${sku}`);
    return { 
      success: true, 
      sku, 
      offerId,
      platform: "eBay1",
      message: `Successfully created and published product on eBay1`
    };
  } catch (error) {
    console.error(`❌ Error creating eBay product:`, error.message);
    throw new Error(`eBay1: ${error.message}`);
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
    try {
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
    } catch (inventoryError) {
      const errorMessage = inventoryError.response?.data?.errors?.[0]?.message || inventoryError.message;
      throw new Error(`eBay2 inventory creation failed: ${errorMessage}`);
    }
    
    // Add a delay to ensure inventory item is fully processed before creating offer
    console.log(`eBay2: Waiting for inventory item to be processed for SKU: ${sku}`);
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay

    console.log(`eBay2: Creating offer for SKU: ${sku}`);
    // Step 2: Create offer with retry logic
    let offerResp;
    try {
      offerResp = await retryOperation(async () => {
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
        return response;
      });
    } catch (offerError) {
      const errorMessage = offerError.response?.data?.errors?.[0]?.message || offerError.message;
      throw new Error(`eBay2 offer creation failed: ${errorMessage}`);
    }

    const offerId = offerResp.data.offerId;

    console.log(`eBay2: Publishing offer ${offerId} for SKU: ${sku}`);
    // Step 3: Publish offer with retry logic
    try {
      await retryOperation(async () => {
        await ebayAxios.post(
          `${EBAY_API_BASE_URL}/sell/inventory/v1/offer/${offerId}/publish`,
          {},
          { headers }
        );
      });
    } catch (publishError) {
      const errorMessage = publishError.response?.data?.errors?.[0]?.message || publishError.message;
      throw new Error(`eBay2 offer publishing failed: ${errorMessage}`);
    }

    console.log(`✅ Created and published eBay2 product: ${sku}`);
    return { 
      success: true, 
      sku, 
      offerId,
      platform: "eBay2",
      message: `Successfully created and published product on eBay2`
    };
  } catch (error) {
    console.error(`❌ Error creating eBay2 product:`, error.message);
    throw new Error(`eBay2: ${error.message}`);
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
    try {
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
    } catch (inventoryError) {
      const errorMessage = inventoryError.response?.data?.errors?.[0]?.message || inventoryError.message;
      throw new Error(`eBay3 inventory creation failed: ${errorMessage}`);
    }
    
    // Add a delay to ensure inventory item is fully processed before creating offer
    console.log(`eBay3: Waiting for inventory item to be processed for SKU: ${sku}`);
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
    
    console.log(`eBay3: Creating offer for SKU: ${sku}`);
    // Step 2: Create offer with retry logic
    let offerResp;
    try {
      offerResp = await retryOperation(async () => {
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
        return response;
      });
    } catch (offerError) {
      const errorMessage = offerError.response?.data?.errors?.[0]?.message || offerError.message;
      throw new Error(`eBay3 offer creation failed: ${errorMessage}`);
    }

    const offerId = offerResp.data.offerId;

    console.log(`eBay3: Publishing offer ${offerId} for SKU: ${sku}`);
    // Step 3: Publish offer with retry logic
    try {
      await retryOperation(async () => {
        await ebayAxios.post(
          `${EBAY_API_BASE_URL}/sell/inventory/v1/offer/${offerId}/publish`,
          {},
          { headers }
        );
      });
    } catch (publishError) {
      const errorMessage = publishError.response?.data?.errors?.[0]?.message || publishError.message;
      throw new Error(`eBay3 offer publishing failed: ${errorMessage}`);
    }

    console.log(`✅ Created and published eBay3 product: ${sku}`);
    return { 
      success: true, 
      sku, 
      offerId,
      platform: "eBay3",
      message: `Successfully created and published product on eBay3`
    };
  } catch (error) {
    console.error(`❌ Error creating eBay3 product:`, error.message);
    throw new Error(`eBay3: ${error.message}`);
  }
}

module.exports = { createEbayProduct, createEbayProduct2, createEbayProduct3 };
