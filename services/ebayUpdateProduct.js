const axios = require("axios");
const { getValidAccessToken } = require("../tools/ebayAuth");
const prisma = require("../db/connection");
const { getValidAccessToken3 } = require("../tools/ebayAuth3");
const { getValidAccessToken2 } = require("../tools/ebayAuth2");

const EBAY_API_BASE_URL = "https://api.ebay.com";

async function updateEbayProduct(sku, product) {
  const token = await getValidAccessToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Content-Language": "en-US",
    Accept: "application/json",
  };

  await axios.put(
    `${EBAY_API_BASE_URL}/sell/inventory/v1/inventory_item/${encodeURIComponent(
      sku
    )}`,
    {
      availability: {
        shipToLocationAvailability: { quantity: product.stockQuantity },
      },
      condition: product.condition || "NEW",
      product: {
        title: product.title,
        description: product.description || "",
        aspects: {
          Brand: [product.brandName || "Generic"],
          Size: [product.size],
          SizeType: [product.sizeType],
          Type: [product.type],
          Department: [product.department],
          Color: [product.color],
        },
        imageUrls: product.images || [],
      },
    },
    { headers }
  );

  const offerResp = await axios.get(
    `${EBAY_API_BASE_URL}/sell/inventory/v1/offer?sku=${encodeURIComponent(
      sku
    )}`,
    { headers }
  );
  const offer = offerResp.data.offers?.[0];
  if (!offer) throw new Error("No existing offer found for SKU");

  const res = await axios.put(
    `${EBAY_API_BASE_URL}/sell/inventory/v1/offer/${offer.offerId}`,
    {
      sku,
      marketplaceId: offer.marketplaceId,
      format: offer.format,
      availableQuantity: product.stockQuantity,
      listingDescription: product.description || "",
      pricingSummary: {
        price: {
          currency: "USD",
          value: product.regularPrice.toFixed(2),
        },
      },
      categoryId: product.categoryId,
      merchantLocationKey:
        product.merchantLocationKey || offer.merchantLocationKey,
      listingPolicies: {
        fulfillmentPolicyId: process.env.EBAY_FULFILLMENT_POLICY_ID,
        paymentPolicyId: process.env.EBAY_PAYMENT_POLICY_ID,
        returnPolicyId: process.env.EBAY_RETURN_POLICY_ID,
      },
      includeCatalogProductDetails: offer.includeCatalogProductDetails,
    },
    { headers }
  );
  console.log("✅ Update Response:", res.status, res.statusText);

  console.log(`✅ eBay product [${sku}] fully updated.`);
}

async function updateEbayProduct2(sku, product) {
  const token = await getValidAccessToken2();

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Content-Language": "en-US",
    Accept: "application/json",
  };

  await axios.put(
    `${EBAY_API_BASE_URL}/sell/inventory/v1/inventory_item/${encodeURIComponent(
      sku
    )}`,
    {
      availability: {
        shipToLocationAvailability: { quantity: product.stockQuantity },
      },
      condition: product.condition || "NEW",
      product: {
        title: product.title,
        description: product.description || "",
        aspects: {
          Brand: [product.brandName || "Generic"],
          Size: [product.size],
          SizeType: [product.sizeType],
          Type: [product.type],
          Department: [product.department],
          Color: [product.color],
        },
        imageUrls: product.images || [],
      },
    },
    { headers }
  );

  const offerResp = await axios.get(
    `${EBAY_API_BASE_URL}/sell/inventory/v1/offer?sku=${encodeURIComponent(
      sku
    )}`,
    { headers }
  );
  const offer = offerResp.data.offers?.[0];
  if (!offer) throw new Error("No existing offer found for SKU");

  const res = await axios.put(
    `${EBAY_API_BASE_URL}/sell/inventory/v1/offer/${offer.offerId}`,
    {
      sku,
      marketplaceId: offer.marketplaceId,
      format: offer.format,
      availableQuantity: product.stockQuantity,
      listingDescription: product.description || "",
      pricingSummary: {
        price: {
          currency: "USD",
          value: product.regularPrice.toFixed(2),
        },
      },
      categoryId: product.categoryId,
      merchantLocationKey:
        product.merchantLocationKey || offer.merchantLocationKey,
      listingPolicies: {
        fulfillmentPolicyId: process.env.EBAY_FULFILLMENT_POLICY_ID,
        paymentPolicyId: process.env.EBAY_PAYMENT_POLICY_ID,
        returnPolicyId: process.env.EBAY_RETURN_POLICY_ID,
      },
      includeCatalogProductDetails: offer.includeCatalogProductDetails,
    },
    { headers }
  );
  console.log("✅ Update Response:", res.status, res.statusText);

  console.log(`✅ eBay product [${sku}] fully updated eBay2.`);
}

async function updateEbayProduct3(sku, product) {
  const token = await getValidAccessToken3();

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Content-Language": "en-US",
    Accept: "application/json",
  };

  await axios.put(
    `${EBAY_API_BASE_URL}/sell/inventory/v1/inventory_item/${encodeURIComponent(
      sku
    )}`,
    {
      availability: {
        shipToLocationAvailability: { quantity: product.stockQuantity },
      },
      condition: product.condition || "NEW",
      product: {
        title: product.title,
        description: product.description || "",
        aspects: {
          Brand: [product.brandName || "Generic"],
          Size: [product.size],
          SizeType: [product.sizeType],
          Type: [product.type],
          Department: [product.department],
          Color: [product.color],
        },
        imageUrls: product.images || [],
      },
    },
    { headers }
  );

  const offerResp = await axios.get(
    `${EBAY_API_BASE_URL}/sell/inventory/v1/offer?sku=${encodeURIComponent(
      sku
    )}`,
    { headers }
  );
  const offer = offerResp.data.offers?.[0];
  if (!offer) throw new Error("No existing offer found for SKU");

  const res = await axios.put(
    `${EBAY_API_BASE_URL}/sell/inventory/v1/offer/${offer.offerId}`,
    {
      sku,
      marketplaceId: offer.marketplaceId,
      format: offer.format,
      availableQuantity: product.stockQuantity,
      listingDescription: product.description || "",
      pricingSummary: {
        price: {
          currency: "USD",
          value: product.regularPrice.toFixed(2),
        },
      },
      categoryId: product.categoryId,
      merchantLocationKey:
        product.merchantLocationKey || offer.merchantLocationKey,
      listingPolicies: {
        fulfillmentPolicyId: process.env.EBAY_FULFILLMENT_POLICY_ID,
        paymentPolicyId: process.env.EBAY_PAYMENT_POLICY_ID,
        returnPolicyId: process.env.EBAY_RETURN_POLICY_ID,
      },
      includeCatalogProductDetails: offer.includeCatalogProductDetails,
    },
    { headers }
  );
  console.log("✅ Update Response:", res.status, res.statusText);

  console.log(`✅ eBay product [${sku}] fully updated eBay3.`);
}

module.exports = {
  updateEbayProduct,
  updateEbayProduct2,
  updateEbayProduct3,
};
