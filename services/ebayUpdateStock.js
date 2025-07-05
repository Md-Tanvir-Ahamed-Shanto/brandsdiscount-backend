const axios = require("axios");
const { getValidAccessToken } = require("../tools/ebayAuth");
const { getValidAccessToken2 } = require("../tools/ebayAuth2");
const { getValidAccessToken3 } = require("../tools/ebayAuth3");

const EBAY_API_BASE_URL = "https://api.ebay.com";

async function ebayUpdateStock(sku, stockQuantity) {
  const token = await getValidAccessToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Content-Language": "en-US",
    "Accept-Language": "en-US",
    Accept: "application/json",
  };

  try {
    const body = {
      availability: {
        shipToLocationAvailability: {
          quantity: stockQuantity || 0,
        },
      },
    };

    const res = await axios.put(
      `${EBAY_API_BASE_URL}/sell/inventory/v1/inventory_item/${sku}`,
      body,
      { headers }
    );
     console.log("✅ Update Response:", res.status, res.statusText);
    console.log(
      `✅ Inventory updated for SKU: ${sku}, New Quantity: ${stockQuantity}`
    );
  } catch (error) {
    console.error(
      "❌ Error updating inventory:",
      error.response?.data || error.message
    );
    throw new Error("Failed to update inventory on eBay.");
  }
}


async function ebayUpdateStock2(sku, stockQuantity) {
  const token = await getValidAccessToken2();

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Content-Language": "en-US",
    "Accept-Language": "en-US",
    Accept: "application/json",
  };

  try {
    const body = {
      availability: {
        shipToLocationAvailability: {
          quantity: stockQuantity || 0,
        },
      },
    };

    const res = await axios.put(
      `${EBAY_API_BASE_URL}/sell/inventory/v1/inventory_item/${sku}`,
      body,
      { headers }
    );
     console.log("✅ Update Response:", res.status, res.statusText);
    console.log(
      `✅ Inventory updated eBay2 for SKU: ${sku}, New Quantity: ${stockQuantity}`
    );
  } catch (error) {
    console.error(
      "❌ Error updating inventory:",
      error.response?.data || error.message
    );
    throw new Error("Failed to update inventory on eBay.");
  }
}


async function ebayUpdateStock3(sku, stockQuantity) {
  const token = await getValidAccessToken3();

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Content-Language": "en-US",
    "Accept-Language": "en-US",
    Accept: "application/json",
  };

  try {
    const body = {
      availability: {
        shipToLocationAvailability: {
          quantity: stockQuantity || 0,
        },
      },
    };

    const res = await axios.put(
      `${EBAY_API_BASE_URL}/sell/inventory/v1/inventory_item/${sku}`,
      body,
      { headers }
    );
     console.log("✅ Update Response:", res.status, res.statusText);
    console.log(
      `✅ Inventory updated eBay3 for SKU: ${sku}, New Quantity: ${stockQuantity}`
    );
  } catch (error) {
    console.error(
      "❌ Error updating inventory:",
      error.response?.data || error.message
    );
    throw new Error("Failed to update inventory on eBay.");
  }
}





module.exports = {
  ebayUpdateStock,
  ebayUpdateStock2,
  ebayUpdateStock3,
};
