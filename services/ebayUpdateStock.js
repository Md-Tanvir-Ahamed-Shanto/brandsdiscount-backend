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
    
    return {
      success: true,
      sku: sku,
      newQuantity: stockQuantity,
      platform: "eBay Account 1",
      message: `Successfully updated inventory for SKU ${sku} to ${stockQuantity} units`
    };
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.message || 
                        error.response?.data?.message || 
                        error.message || 
                        "Unknown eBay API error";
    
    console.error(
      `❌ Error updating inventory for SKU ${sku} on eBay Account 1:`,
      error.response?.data || error.message
    );
    
    throw new Error(`Failed to update inventory on eBay Account 1 for SKU ${sku}: ${errorMessage}`);
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
    
    return {
      success: true,
      sku: sku,
      newQuantity: stockQuantity,
      platform: "eBay Account 2",
      message: `Successfully updated inventory for SKU ${sku} to ${stockQuantity} units`
    };
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.message || 
                        error.response?.data?.message || 
                        error.message || 
                        "Unknown eBay API error";
    
    console.error(
      `❌ Error updating inventory for SKU ${sku} on eBay Account 2:`,
      error.response?.data || error.message
    );
    
    throw new Error(`Failed to update inventory on eBay Account 2 for SKU ${sku}: ${errorMessage}`);
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
    
    return {
      success: true,
      sku: sku,
      newQuantity: stockQuantity,
      platform: "eBay Account 3",
      message: `Successfully updated inventory for SKU ${sku} to ${stockQuantity} units`
    };
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.message || 
                        error.response?.data?.message || 
                        error.message || 
                        "Unknown eBay API error";
    
    console.error(
      `❌ Error updating inventory for SKU ${sku} on eBay Account 3:`,
      error.response?.data || error.message
    );
    
    throw new Error(`Failed to update inventory on eBay Account 3 for SKU ${sku}: ${errorMessage}`);
  }
}





module.exports = {
  ebayUpdateStock,
  ebayUpdateStock2,
  ebayUpdateStock3,
};
