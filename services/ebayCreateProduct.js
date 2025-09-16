const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const { getValidAccessToken2 } = require("../tools/ebayAuth2");
const { getValidAccessToken3 } = require("../tools/ebayAuth3");
const { getValidAccessToken } = require("../tools/ebayAuth");
const prisma = new PrismaClient();

const EBAY_API_BASE_URL = "https://api.ebay.com";

async function createEbayProduct(product) {
  const token = await getValidAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "Content-Language": "en-US",
  };

  const title = product.title || "Untitled Product";
  const brandName = product.brandName || "Generic Brand";
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

  // Step 1: Create or update inventory item
  await axios.put(
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
          Size: [size],
          SizeType: [sizeType],
          Type: [type],
          Department: [department],
          Color: [color], // Include the Color aspect here
        },
        imageUrls: images,
      },
    },
    { headers }
  );

  // Step 2: Create offer
  const offerResp = await axios.post(
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

  const offerId = offerResp.data.offerId;

  // Step 3: Publish offer
  await axios.post(
    `${EBAY_API_BASE_URL}/sell/inventory/v1/offer/${offerId}/publish`,
    {},
    { headers }
  );

  console.log(`✅ Created and published eBay product: ${sku}`);
}


async function createEbayProduct2(product) {
  const token = await getValidAccessToken2();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "Content-Language": "en-US",
  };

  const title = product.title || "Untitled Product";
  const brandName = product.brandName || "Generic Brand";
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

  // Step 1: Create or update inventory item
  await axios.put(
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
          Size: [size],
          SizeType: [sizeType],
          Type: [type],
          Department: [department],
          Color: [color], // Include the Color aspect here
        },
        imageUrls: images,
      },
    },
    { headers }
  );

  // Step 2: Create offer
  const offerResp = await axios.post(
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

  const offerId = offerResp.data.offerId;

  // Step 3: Publish offer
  await axios.post(
    `${EBAY_API_BASE_URL}/sell/inventory/v1/offer/${offerId}/publish`,
    {},
    { headers }
  );

  console.log(`✅ Created and published eBay2 product: ${sku}`);
}


async function createEbayProduct3(product) {
  const token = await getValidAccessToken3();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "Content-Language": "en-US",
  };

  const title = product.title || "Untitled Product";
  const brandName = product.brandName || "Generic Brand";
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

  // Step 1: Create or update inventory item
  await axios.put(
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
          Size: [size],
          SizeType: [sizeType],
          Type: [type],
          Department: [department],
          Color: [color], // Include the Color aspect here
        },
        imageUrls: images,
      },
    },
    { headers }
  );

  // Step 2: Create offer
  const offerResp = await axios.post(
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

  const offerId = offerResp.data.offerId;

  // Step 3: Publish offer
  await axios.post(
    `${EBAY_API_BASE_URL}/sell/inventory/v1/offer/${offerId}/publish`,
    {},
    { headers }
  );

  console.log(`✅ Created and published eBay3 product: ${sku}`);
}

module.exports = { createEbayProduct, createEbayProduct2, createEbayProduct3 };
