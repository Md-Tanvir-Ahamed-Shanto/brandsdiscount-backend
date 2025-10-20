const axios = require("axios");
const { getValidAccessToken } = require("../tools/ebayAuth");
const { getValidAccessToken2 } = require("../tools/ebayAuth2");
const { getValidAccessToken3 } = require("../tools/ebayAuth3");

const EBAY_API_BASE_URL = "https://api.ebay.com";

async function ebayUpdateStock(sku, stockQuantity) {
  const token = await getValidAccessToken();
  const quantity = parseInt(stockQuantity) || 0;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Content-Language": "en-US",
    "Accept-Language": "en-US",
    Accept: "application/json",
  };

  try {
    if (quantity === 0) {
      // Use delete API when stock is 0
      const DELETE_API_URL = `https://api.ebay.com/sell/inventory/v1/inventory_item/${sku}`;
      
      console.log(`🗑️ Deleting inventory item for SKU ${sku} on eBay Account 1 (stock = 0)`);
      
      const res = await axios.delete(DELETE_API_URL, { headers });
      
      console.log("✅ Delete Response:", res.status, res.statusText);
      console.log(`✅ Inventory item deleted for SKU: ${sku}`);
      
      return {
        success: true,
        sku: sku,
        newQuantity: 0,
        platform: "eBay Account 1",
        message: `Successfully deleted inventory item for SKU ${sku} (stock set to 0)`
      };
    } else {
      // Use bulk update API when stock > 0
      const BULK_UPDATE_API_URL = "https://api.ebay.com/sell/inventory/v1/bulk_update_price_quantity";
      
      console.log(`🔄 Updating inventory for SKU ${sku} on eBay Account 1 to quantity ${quantity}`);
      
      const payload = {
        requests: [
          {
            sku: sku,
            shipToLocationAvailability: {
              quantity: quantity,
            },
          },
        ],
      };

      const res = await axios.post(BULK_UPDATE_API_URL, payload, { headers });
      
      // Check if the bulk API returned any errors in the response
      if (res.data && res.data.responses) {
        const response = res.data.responses[0];
        if (response.statusCode && response.statusCode !== 200) {
          throw new Error(`eBay API returned status ${response.statusCode} for SKU ${sku}`);
        }
      }
      
      console.log("✅ Update Response:", res.status, res.statusText);
      console.log("✅ Response Data:", JSON.stringify(res.data, null, 2));
      console.log(`✅ Inventory updated for SKU: ${sku}, New Quantity: ${quantity}`);
      
      return {
        success: true,
        sku: sku,
        newQuantity: quantity,
        platform: "eBay Account 1",
        message: `Successfully updated inventory for SKU ${sku} to ${quantity} units`
      };
    }
  } catch (error) {
    // Handle different API error structures
    let errorMessage = "Unknown eBay API error";
    
    if (error.response?.data?.responses) {
      const response = error.response.data.responses[0];
      errorMessage = `Bulk API error - Status: ${response.statusCode}, SKU: ${response.sku}`;
    } else if (error.response?.data?.errors?.[0]?.message) {
      errorMessage = error.response.data.errors[0].message;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    const action = quantity === 0 ? "deleting" : "updating";
    console.error(
      `❌ Error ${action} inventory for SKU ${sku} on eBay Account 1:`,
      error.response?.data || error.message
    );
    
    throw new Error(`Failed to ${action.slice(0, -3)} inventory on eBay Account 1 for SKU ${sku}: ${errorMessage}`);
  }
}


async function ebayUpdateStock2(sku, stockQuantity) {
  const token = await getValidAccessToken2();
  const quantity = parseInt(stockQuantity) || 0;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Content-Language": "en-US",
    "Accept-Language": "en-US",
    Accept: "application/json",
  };

  try {
    if (quantity === 0) {
      // Use delete API when stock is 0
      const DELETE_API_URL = `https://api.ebay.com/sell/inventory/v1/inventory_item/${sku}`;
      
      console.log(`🗑️ Deleting inventory item for SKU ${sku} on eBay Account 2 (stock = 0)`);
      
      const res = await axios.delete(DELETE_API_URL, { headers });
      
      console.log("✅ Delete Response:", res.status, res.statusText);
      console.log(`✅ Inventory item deleted for SKU: ${sku}`);
      
      return {
        success: true,
        sku: sku,
        newQuantity: 0,
        platform: "eBay Account 2",
        message: `Successfully deleted inventory item for SKU ${sku} (stock set to 0)`
      };
    } else {
      // Use bulk update API when stock > 0
      const BULK_UPDATE_API_URL = "https://api.ebay.com/sell/inventory/v1/bulk_update_price_quantity";
      
      console.log(`🔄 Updating inventory for SKU ${sku} on eBay Account 2 to quantity ${quantity}`);
      
      const payload = {
        requests: [
          {
            sku: sku,
            shipToLocationAvailability: {
              quantity: quantity,
            },
          },
        ],
      };

      const res = await axios.post(BULK_UPDATE_API_URL, payload, { headers });
      
      // Check if the bulk API returned any errors in the response
      if (res.data && res.data.responses) {
        const response = res.data.responses[0];
        if (response.statusCode && response.statusCode !== 200) {
          throw new Error(`eBay API returned status ${response.statusCode} for SKU ${sku}`);
        }
      }
      
      console.log("✅ Update Response:", res.status, res.statusText);
      console.log("✅ Response Data:", JSON.stringify(res.data, null, 2));
      console.log(`✅ Inventory updated eBay2 for SKU: ${sku}, New Quantity: ${quantity}`);
      
      return {
        success: true,
        sku: sku,
        newQuantity: quantity,
        platform: "eBay Account 2",
        message: `Successfully updated inventory for SKU ${sku} to ${quantity} units`
      };
    }
  } catch (error) {
    // Handle different API error structures
    let errorMessage = "Unknown eBay API error";
    
    if (error.response?.data?.responses) {
      const response = error.response.data.responses[0];
      errorMessage = `Bulk API error - Status: ${response.statusCode}, SKU: ${response.sku}`;
    } else if (error.response?.data?.errors?.[0]?.message) {
      errorMessage = error.response.data.errors[0].message;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    const action = quantity === 0 ? "deleting" : "updating";
    console.error(
      `❌ Error ${action} inventory for SKU ${sku} on eBay Account 2:`,
      error.response?.data || error.message
    );
    
    throw new Error(`Failed to ${action.slice(0, -3)} inventory on eBay Account 2 for SKU ${sku}: ${errorMessage}`);
  }
}


async function ebayUpdateStock3(sku, stockQuantity) {
  const token = await getValidAccessToken3();
  const quantity = parseInt(stockQuantity) || 0;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Content-Language": "en-US",
    "Accept-Language": "en-US",
    Accept: "application/json",
  };

  try {
    if (quantity === 0) {
      // Use delete API when stock is 0
      const DELETE_API_URL = `https://api.ebay.com/sell/inventory/v1/inventory_item/${sku}`;
      
      console.log(`🗑️ Deleting inventory item for SKU ${sku} on eBay Account 3 (stock = 0)`);
      
      const res = await axios.delete(DELETE_API_URL, { headers });
      
      console.log("✅ Delete Response:", res.status, res.statusText);
      console.log(`✅ Inventory item deleted for SKU: ${sku}`);
      
      return {
        success: true,
        sku: sku,
        newQuantity: 0,
        platform: "eBay Account 3",
        message: `Successfully deleted inventory item for SKU ${sku} (stock set to 0)`
      };
    } else {
      // Use bulk update API when stock > 0
      const BULK_UPDATE_API_URL = "https://api.ebay.com/sell/inventory/v1/bulk_update_price_quantity";
      
      console.log(`🔄 Updating inventory for SKU ${sku} on eBay Account 3 to quantity ${quantity}`);
      
      const payload = {
        requests: [
          {
            sku: sku,
            shipToLocationAvailability: {
              quantity: quantity,
            },
          },
        ],
      };

      const res = await axios.post(BULK_UPDATE_API_URL, payload, { headers });
      
      // Check if the bulk API returned any errors in the response
      if (res.data && res.data.responses) {
        const response = res.data.responses[0];
        if (response.statusCode && response.statusCode !== 200) {
          throw new Error(`eBay API returned status ${response.statusCode} for SKU ${sku}`);
        }
      }
      
      console.log("✅ Update Response:", res.status, res.statusText);
      console.log("✅ Response Data:", JSON.stringify(res.data, null, 2));
      console.log(`✅ Inventory updated eBay3 for SKU: ${sku}, New Quantity: ${quantity}`);
      
      return {
        success: true,
        sku: sku,
        newQuantity: quantity,
        platform: "eBay Account 3",
        message: `Successfully updated inventory for SKU ${sku} to ${quantity} units`
      };
    }
  } catch (error) {
    // Handle different API error structures
    let errorMessage = "Unknown eBay API error";
    
    if (error.response?.data?.responses) {
      const response = error.response.data.responses[0];
      errorMessage = `Bulk API error - Status: ${response.statusCode}, SKU: ${response.sku}`;
    } else if (error.response?.data?.errors?.[0]?.message) {
      errorMessage = error.response.data.errors[0].message;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    const action = quantity === 0 ? "deleting" : "updating";
    console.error(
      `❌ Error ${action} inventory for SKU ${sku} on eBay Account 3:`,
      error.response?.data || error.message
    );
    
    throw new Error(`Failed to ${action.slice(0, -3)} inventory on eBay Account 3 for SKU ${sku}: ${errorMessage}`);
  }
}





async function manulayUpdateEbayStock(sku, stockQuantity = 0, ebayAccount = "all") {
  try {
    let update1, update2, update3;
    if (ebayAccount === "all" || ebayAccount === "1") {
      update1 = await ebayUpdateStock(sku, stockQuantity);
    }
    if (ebayAccount === "all" || ebayAccount === "2") {
      update2 = await ebayUpdateStock2(sku, stockQuantity);
    }
    if (ebayAccount === "all" || ebayAccount === "3") {
      update3 = await ebayUpdateStock3(sku, stockQuantity);
    }
    
    return {
      success: true,
      sku: sku,
      newQuantity: stockQuantity,
      platform: `eBay Account ${ebayAccount || "1, 2, 3"}`,
      message: `Successfully updated inventory for SKU ${sku} to ${stockQuantity} units on eBay Account ${ebayAccount || "1, 2, 3"}`
    };
  } catch (error) {
    console.error(`❌ Error manually updating eBay stock for SKU ${sku}:`, error.message);
    throw error;
  }
}


module.exports = {
  ebayUpdateStock,
  ebayUpdateStock2,
  ebayUpdateStock3,
  manulayUpdateEbayStock,
};
