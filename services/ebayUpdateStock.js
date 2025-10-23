const axios = require("axios");
const { getValidAccessToken } = require("../tools/ebayAuth");
const { getValidAccessToken2 } = require("../tools/ebayAuth2");
const { getValidAccessToken3 } = require("../tools/ebayAuth3");
const { createNotification } = require("../utils/notification");

const EBAY_API_BASE_URL = "https://api.ebay.com";

/**
 * Creates a notification for eBay policy restriction scenarios
 * @param {string} sku - Product SKU
 * @param {string} ebayAccount - eBay account identifier (1, 2, or 3)
 */
async function createPolicyRestrictionNotification(sku, ebayAccount) {
  try {
    await createNotification({
      title: "eBay Policy Restriction - Manual Action Required",
      message: `The Order (SKU-${sku}) from "ebay${ebayAccount}" could not be synced due to an eBay policy restriction. Please manually reduce the inventory by 1 on "ebay${ebayAccount}".`,
      location: `eBay${ebayAccount}`,
      selledBy: `EBAY${ebayAccount}`,
    });
    console.log(
      `📢 Policy restriction notification created for SKU ${sku} on eBay Account ${ebayAccount}`
    );
  } catch (notificationError) {
    console.error(
      `❌ Failed to create policy restriction notification for SKU ${sku} on eBay Account ${ebayAccount}:`,
      notificationError.message
    );
  }
}

/**
 * Creates a notification for stock deletion errors
 * @param {string} sku - Product SKU
 * @param {string} ebayAccount - eBay account identifier (1, 2, or 3)
 * @param {string} errorMessage - Error message details
 */
async function createStockDeletionErrorNotification(
  sku,
  ebayAccount,
  errorMessage
) {
  try {
    await createNotification({
      title: "eBay Stock Deletion Failed",
      message: `Failed to delete inventory for SKU-${sku} on "ebay${ebayAccount}". Error: ${errorMessage}. Please manually check and update the inventory.`,
      location: `eBay${ebayAccount}`,
      selledBy: `EBAY${ebayAccount}`,
    });
    console.log(
      `📢 Stock deletion error notification created for SKU ${sku} on eBay Account ${ebayAccount}`
    );
  } catch (notificationError) {
    console.error(
      `❌ Failed to create stock deletion error notification for SKU ${sku} on eBay Account ${ebayAccount}:`,
      notificationError.message
    );
  }
}

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

      console.log(
        `🗑️ Deleting inventory item for SKU ${sku} on eBay Account 1 (stock = 0)`
      );

      const res = await axios.delete(DELETE_API_URL, { headers });

      console.log("✅ Delete Response:", res.status, res.statusText);
      console.log(`✅ Inventory item deleted for SKU: ${sku}`);

      return {
        success: true,
        sku: sku,
        newQuantity: 0,
        platform: "eBay Account 1",
        message: `Successfully deleted inventory item for SKU ${sku} (stock set to 0)`,
      };
    } else {
      // Use bulk update API when stock > 0
      // const BULK_UPDATE_API_URL = "https://api.ebay.com/sell/inventory/v1/bulk_update_price_quantity";

      // console.log(`🔄 Updating inventory for SKU ${sku} on eBay Account 1 to quantity ${quantity}`);

      // const payload = {
      //   requests: [
      //     {
      //       sku: sku,
      //       shipToLocationAvailability: {
      //         quantity: quantity,
      //       },
      //     },
      //   ],
      // };

      // const res = await axios.post(BULK_UPDATE_API_URL, payload, { headers });

      // // Check if the bulk API returned any errors in the response
      // if (res.data && res.data.responses) {
      //   const response = res.data.responses[0];
      //   if (response.statusCode && response.statusCode !== 200) {
      //     throw new Error(`eBay API returned status ${response.statusCode} for SKU ${sku}`);
      //   }
      // }

      // console.log("✅ Update Response:", res.status, res.statusText);
      // console.log("✅ Response Data:", JSON.stringify(res.data, null, 2));
      // console.log(`✅ Inventory updated for SKU: ${sku}, New Quantity: ${quantity}`);

      await createPolicyRestrictionNotification(sku, "1");

      return {
        success: false,
        sku: sku,
        newQuantity: quantity,
        platform: "eBay Account 1",
        message: `Please Update manually on eBay Account 2 for SKU ${sku} to ${quantity} units`,
      };
    }
  } catch (error) {
    // Handle different API error structures
    let errorMessage = "Unknown eBay API error";
    let isPolicyRestriction = false;

    if (error.response?.data?.responses) {
      const response = error.response.data.responses[0];
      errorMessage = `Bulk API error - Status: ${response.statusCode}, SKU: ${response.sku}`;
    } else if (error.response?.data?.errors?.[0]?.message) {
      errorMessage = error.response.data.errors[0].message;
      // Check for policy restriction indicators
      isPolicyRestriction =
        errorMessage.toLowerCase().includes("policy") ||
        errorMessage.toLowerCase().includes("restriction") ||
        errorMessage.toLowerCase().includes("prohibited");
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
      isPolicyRestriction =
        errorMessage.toLowerCase().includes("policy") ||
        errorMessage.toLowerCase().includes("restriction") ||
        errorMessage.toLowerCase().includes("prohibited");
    } else if (error.message) {
      errorMessage = error.message;
    }

    const action = quantity === 0 ? "deleting" : "updating";
    console.error(
      `❌ Error ${action} inventory for SKU ${sku} on eBay Account 1:`,
      error.response?.data || error.message
    );

    // Create appropriate notifications based on error type
    if (isPolicyRestriction) {
      await createPolicyRestrictionNotification(sku, "1");
    } else if (quantity === 0) {
      // Stock deletion error
      await createStockDeletionErrorNotification(sku, "1", errorMessage);
    }

    throw new Error(
      `Failed to ${action.slice(
        0,
        -3
      )} inventory on eBay Account 1 for SKU ${sku}: ${errorMessage}`
    );
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

      console.log(
        `🗑️ Deleting inventory item for SKU ${sku} on eBay Account 2 (stock = 0)`
      );

      const res = await axios.delete(DELETE_API_URL, { headers });

      console.log("✅ Delete Response:", res.status, res.statusText);
      console.log(`✅ Inventory item deleted for SKU: ${sku}`);

      return {
        success: true,
        sku: sku,
        newQuantity: 0,
        platform: "eBay Account 2",
        message: `Successfully deleted inventory item for SKU ${sku} (stock set to 0)`,
      };
    } else {
      await createPolicyRestrictionNotification(sku, "2");

      return {
        success: false,
        sku: sku,
        newQuantity: quantity,
        platform: "eBay Account 2",
        message: `Please Update manually on eBay Account 2 for SKU ${sku} to ${quantity} units`,
      };
    }
  } catch (error) {
    // Handle different API error structures
    let errorMessage = "Unknown eBay API error";
    let isPolicyRestriction = false;

    if (error.response?.data?.responses) {
      const response = error.response.data.responses[0];
      errorMessage = `Bulk API error - Status: ${response.statusCode}, SKU: ${response.sku}`;
    } else if (error.response?.data?.errors?.[0]?.message) {
      errorMessage = error.response.data.errors[0].message;
      // Check for policy restriction indicators
      isPolicyRestriction =
        errorMessage.toLowerCase().includes("policy") ||
        errorMessage.toLowerCase().includes("restriction") ||
        errorMessage.toLowerCase().includes("prohibited");
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
      isPolicyRestriction =
        errorMessage.toLowerCase().includes("policy") ||
        errorMessage.toLowerCase().includes("restriction") ||
        errorMessage.toLowerCase().includes("prohibited");
    } else if (error.message) {
      errorMessage = error.message;
    }

    const action = quantity === 0 ? "deleting" : "updating";
    console.error(
      `❌ Error ${action} inventory for SKU ${sku} on eBay Account 2:`,
      error.response?.data || error.message
    );

    // Create appropriate notifications based on error type
    if (isPolicyRestriction) {
      await createPolicyRestrictionNotification(sku, "2");
    } else if (quantity === 0) {
      // Stock deletion error
      await createStockDeletionErrorNotification(sku, "2", errorMessage);
    }

    throw new Error(
      `Failed to ${action.slice(
        0,
        -3
      )} inventory on eBay Account 2 for SKU ${sku}: ${errorMessage}`
    );
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

      console.log(
        `🗑️ Deleting inventory item for SKU ${sku} on eBay Account 3 (stock = 0)`
      );

      const res = await axios.delete(DELETE_API_URL, { headers });

      console.log("✅ Delete Response:", res.status, res.statusText);
      console.log(`✅ Inventory item deleted for SKU: ${sku}`);

      return {
        success: true,
        sku: sku,
        newQuantity: 0,
        platform: "eBay Account 3",
        message: `Successfully deleted inventory item for SKU ${sku} (stock set to 0)`,
      };
    } else {
      await createPolicyRestrictionNotification(sku, "3");
      return {
        success: false,
        sku: sku,
        newQuantity: quantity,
        platform: "eBay Account 3",
        message: `Please Update manually on eBay Account 3 for SKU ${sku} to ${quantity} units`,
      };
    }
  } catch (error) {
    // Handle different API error structures
    let errorMessage = "Unknown eBay API error";
    let isPolicyRestriction = false;

    if (error.response?.data?.responses) {
      const response = error.response.data.responses[0];
      errorMessage = `Bulk API error - Status: ${response.statusCode}, SKU: ${response.sku}`;
    } else if (error.response?.data?.errors?.[0]?.message) {
      errorMessage = error.response.data.errors[0].message;
      // Check for policy restriction indicators
      isPolicyRestriction =
        errorMessage.toLowerCase().includes("policy") ||
        errorMessage.toLowerCase().includes("restriction") ||
        errorMessage.toLowerCase().includes("prohibited");
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
      isPolicyRestriction =
        errorMessage.toLowerCase().includes("policy") ||
        errorMessage.toLowerCase().includes("restriction") ||
        errorMessage.toLowerCase().includes("prohibited");
    } else if (error.message) {
      errorMessage = error.message;
    }

    const action = quantity === 0 ? "deleting" : "updating";
    console.error(
      `❌ Error ${action} inventory for SKU ${sku} on eBay Account 3:`,
      error.response?.data || error.message
    );

    // Create appropriate notifications based on error type
    if (isPolicyRestriction) {
      await createPolicyRestrictionNotification(sku, "3");
    } else if (quantity === 0) {
      // Stock deletion error
      await createStockDeletionErrorNotification(sku, "3", errorMessage);
    }

    throw new Error(
      `Failed to ${action.slice(
        0,
        -3
      )} inventory on eBay Account 3 for SKU ${sku}: ${errorMessage}`
    );
  }
}

async function manulayUpdateEbayStock(
  sku,
  stockQuantity = 0,
  ebayAccount = "all"
) {
  const results = {
    success: false,
    sku: sku,
    newQuantity: stockQuantity,
    platform: `eBay Account ${ebayAccount || "1, 2, 3"}`,
    accountResults: {},
    errors: [],
  };

  // Handle each account separately to provide detailed feedback
  if (ebayAccount === "all" || ebayAccount === "1") {
    try {
      results.accountResults.account1 = await ebayUpdateStock(
        sku,
        stockQuantity
      );
      console.log(`✅ eBay Account 1 updated successfully for SKU ${sku}`);
    } catch (error) {
      console.error(
        `❌ eBay Account 1 update failed for SKU ${sku}:`,
        error.message
      );
      results.errors.push(`Account 1: ${error.message}`);
      results.accountResults.account1 = {
        success: false,
        error: error.message,
      };
    }
  }

  if (ebayAccount === "all" || ebayAccount === "2") {
    try {
      results.accountResults.account2 = await ebayUpdateStock2(
        sku,
        stockQuantity
      );
      console.log(`✅ eBay Account 2 updated successfully for SKU ${sku}`);
    } catch (error) {
      console.error(
        `❌ eBay Account 2 update failed for SKU ${sku}:`,
        error.message
      );
      results.errors.push(`Account 2: ${error.message}`);
      results.accountResults.account2 = {
        success: false,
        error: error.message,
      };
    }
  }

  if (ebayAccount === "all" || ebayAccount === "3") {
    try {
      results.accountResults.account3 = await ebayUpdateStock3(
        sku,
        stockQuantity
      );
      console.log(`✅ eBay Account 3 updated successfully for SKU ${sku}`);
    } catch (error) {
      console.error(
        `❌ eBay Account 3 update failed for SKU ${sku}:`,
        error.message
      );
      results.errors.push(`Account 3: ${error.message}`);
      results.accountResults.account3 = {
        success: false,
        error: error.message,
      };
    }
  }

  // Determine overall success
  const successfulAccounts = Object.values(results.accountResults).filter(
    (result) => result.success !== false
  );
  results.success = successfulAccounts.length > 0;

  if (results.success) {
    results.message = `Successfully updated inventory for SKU ${sku} to ${stockQuantity} units on ${successfulAccounts.length} eBay account(s)`;
    if (results.errors.length > 0) {
      results.message += `. Some accounts failed: ${results.errors.join(", ")}`;
    }
  } else {
    results.message = `Failed to update inventory for SKU ${sku} on all eBay accounts: ${results.errors.join(
      ", "
    )}`;
    throw new Error(results.message);
  }

  return results;
}

module.exports = {
  ebayUpdateStock,
  ebayUpdateStock2,
  ebayUpdateStock3,
  manulayUpdateEbayStock,
};
