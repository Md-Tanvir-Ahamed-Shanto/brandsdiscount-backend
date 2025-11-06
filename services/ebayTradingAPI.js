const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const { getValidAccessToken } = require("../tools/ebayAuth");
const { getValidAccessToken2 } = require("../tools/ebayAuth2");
const { getValidAccessToken3 } = require("../tools/ebayAuth3");
const { createNotification } = require("../utils/notification");
const xml2js = require("xml2js");
const prisma = new PrismaClient();

const EBAY_TRADING_API_URL = "https://api.ebay.com/ws/api.dll";
const EBAY_SANDBOX_TRADING_API_URL = "https://api.sandbox.ebay.com/ws/api.dll";

const CURRENT_API_URL = process.env.NODE_ENV === 'production' 
  ? EBAY_TRADING_API_URL 
  : EBAY_SANDBOX_TRADING_API_URL;

const ebayTradingAxios = axios.create({
  timeout: 90000,
});

function categorizeTradingError(error) {
  const errorMessage = error.response?.data || error.message;
  const statusCode = error.response?.status;

  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return {
      category: 'TIMEOUT_ERROR',
      code: 'EBAY_TRADING_TIMEOUT',
      message: 'eBay Trading API request timed out. Please try again.',
      details: { originalError: errorMessage, timeout: true }
    };
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return {
      category: 'NETWORK_ERROR',
      code: 'EBAY_TRADING_NETWORK',
      message: 'Unable to connect to eBay Trading API. Please check your internet connection.',
      details: { originalError: errorMessage, network: true }
    };
  }

  if (statusCode === 401 || errorMessage?.includes('token') || errorMessage?.includes('auth')) {
    return {
      category: 'AUTH_ERROR',
      code: 'EBAY_TRADING_AUTH',
      message: 'eBay Trading API authentication failed. Please check your API credentials.',
      details: { originalError: errorMessage, statusCode }
    };
  }

  if (statusCode === 429) {
    return {
      category: 'RATE_LIMIT_ERROR',
      code: 'EBAY_TRADING_RATE_LIMIT',
      message: 'eBay Trading API rate limit exceeded. Please wait before trying again.',
      details: { originalError: errorMessage, statusCode }
    };
  }

  if (statusCode === 400) {
    return {
      category: 'VALIDATION_ERROR',
      code: 'EBAY_TRADING_VALIDATION',
      message: `eBay Trading API validation error: ${errorMessage}`,
      details: { originalError: errorMessage, statusCode }
    };
  }

  if (statusCode >= 500) {
    return {
      category: 'SERVER_ERROR',
      code: 'EBAY_TRADING_SERVER',
      message: 'eBay Trading API server error. Please try again later.',
      details: { originalError: errorMessage, statusCode }
    };
  }

  return {
    category: 'UNKNOWN_ERROR',
    code: 'EBAY_TRADING_UNKNOWN',
    message: errorMessage || 'Unknown eBay Trading API error occurred',
    details: { originalError: errorMessage, statusCode }
  };
}

function createTradingResponse(success, platform, data = null, error = null) {
  const response = {
    success,
    platform,
    apiType: 'Trading',
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

function prepareTradingProductAspects(globalRequiredFields = {}) {
  const aspects = [];
  
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

function createAddFixedPriceItemXML(product, globalRequiredFields = {}, authToken, accountNumber = 1) {
  const title = (product.title || "Untitled Product").substring(0, 80);
  const images = product.images || [];
  const sku = product.sku || `SKU-${Date.now()}`;
  const regularPrice = product.regularPrice || 0;
  const stockQuantity = product.stockQuantity || 0;
  const description = product.description || "";
  const categoryId = product.categoryId || "53159";
  
  const aspects = prepareTradingProductAspects(globalRequiredFields);
  
  let itemSpecificsXML = '';
  aspects.forEach(aspect => {
    itemSpecificsXML += `
      <NameValueList>
        <Name>${aspect.name}</Name>
        <Value>${aspect.values[0]}</Value>
      </NameValueList>`;
  });
  
  itemSpecificsXML += `
    <NameValueList>
      <Name>MPN</Name>
      <Value>Does not apply</Value>
    </NameValueList>`;
  
  let picturesXML = '';
  images.forEach((imageUrl, index) => {
    if (index < 12) {
      picturesXML += `<PictureURL>${imageUrl}</PictureURL>`;
    }
  });

  const fulfillmentPolicyId = accountNumber === 1 ? process.env.EBAY_FULFILLMENT_POLICY_ID : 
                              accountNumber === 2 ? process.env.EBAY2_FULFILLMENT_POLICY_ID : 
                              process.env.EBAY3_FULFILLMENT_POLICY_ID;
  
  const paymentPolicyId = accountNumber === 1 ? process.env.EBAY_PAYMENT_POLICY_ID : 
                         accountNumber === 2 ? process.env.EBAY2_PAYMENT_POLICY_ID : 
                         process.env.EBAY3_PAYMENT_POLICY_ID;
  
  const returnPolicyId = accountNumber === 1 ? process.env.EBAY_RETURN_POLICY_ID : 
                        accountNumber === 2 ? process.env.EBAY2_RETURN_POLICY_ID : 
                        process.env.EBAY3_RETURN_POLICY_ID;

  let sellerProfilesXML = '';
  if (fulfillmentPolicyId || paymentPolicyId || returnPolicyId) {
    sellerProfilesXML = '<SellerProfiles>';
    
    if (paymentPolicyId) {
      sellerProfilesXML += `
        <SellerPaymentProfile>
          <PaymentProfileID>${paymentPolicyId}</PaymentProfileID>
        </SellerPaymentProfile>`;
    }
    
    if (returnPolicyId) {
      sellerProfilesXML += `
        <SellerReturnProfile>
          <ReturnProfileID>${returnPolicyId}</ReturnProfileID>
        </SellerReturnProfile>`;
    }
    
    if (fulfillmentPolicyId) {
      sellerProfilesXML += `
        <SellerShippingProfile>
          <ShippingProfileID>${fulfillmentPolicyId}</ShippingProfileID>
        </SellerShippingProfile>`;
    }
    
    sellerProfilesXML += '</SellerProfiles>';
  }
  
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<AddFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <Item>
    <Title>${title}</Title>
    <Description><![CDATA[${description}]]></Description>
    <PrimaryCategory>
      <CategoryID>${categoryId}</CategoryID>
    </PrimaryCategory>
    <StartPrice>${regularPrice.toFixed(2)}</StartPrice>
    <ConditionID>1000</ConditionID>
    <ListingType>FixedPriceItem</ListingType>
    <Quantity>${stockQuantity}</Quantity>
    <Country>US</Country>
    <Currency>USD</Currency>
    <DispatchTimeMax>1</DispatchTimeMax>
    <ListingDuration>GTC</ListingDuration>
    <PaymentMethods>PayPal</PaymentMethods>
    <PayPalEmailAddress>${process.env.PAYPAL_EMAIL || 'seller@example.com'}</PayPalEmailAddress>
    <ShippingDetails>
      <ShippingType>Flat</ShippingType>
      <ShippingServiceOptions>
        <ShippingServicePriority>1</ShippingServicePriority>
        <ShippingService>USPSMedia</ShippingService>
        <ShippingServiceCost>2.50</ShippingServiceCost>
      </ShippingServiceOptions>
    </ShippingDetails>
    <ReturnPolicy>
      <ReturnsAcceptedOption>ReturnsAccepted</ReturnsAcceptedOption>
      <RefundOption>MoneyBack</RefundOption>
      <ReturnsWithinOption>Days_30</ReturnsWithinOption>
      <ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>
    </ReturnPolicy>
    <ItemSpecifics>
      ${itemSpecificsXML}
    </ItemSpecifics>
    <PictureDetails>
      ${picturesXML}
    </PictureDetails>
    <SKU>${sku}</SKU>
    ${sellerProfilesXML}
  </Item>
</AddFixedPriceItemRequest>`;

  return xml;
}

function createReviseItemXML(itemId, quantity, authToken) {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<ReviseItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <Item>
    <ItemID>${itemId}</ItemID>
    <Quantity>${quantity}</Quantity>
  </Item>
</ReviseItemRequest>`;

  return xml;
}

function createGetMyeBaySellingXML(authToken, sku) {
  return `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <ActiveList>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>200</EntriesPerPage>
      <PageNumber>1</PageNumber>
    </Pagination>
  </ActiveList>
  <DetailLevel>ReturnAll</DetailLevel>
</GetMyeBaySellingRequest>`;
}

async function getItemIdBySku(sku, accountNumber = 1) {
  try {
    console.log(`Getting ItemID for SKU: ${sku} on eBay Account ${accountNumber}`);
    accountNumber = Number(accountNumber);
    let token;
    switch(accountNumber) {
      case 1:
        token = await getValidAccessToken();
        break;
      case 2:
        token = await getValidAccessToken2();
        break;
      case 3:
        token = await getValidAccessToken3();
        break;
      default:
        throw new Error(`Invalid account number: ${accountNumber}. Must be 1, 2, or 3.`);
    }
    
    const xml = createGetMyeBaySellingXML(token, sku);
    const response = await sendTradingAPIRequest(xml, 'GetMyeBaySelling',token);
    
    if (response.GetMyeBaySellingResponse && response.GetMyeBaySellingResponse.Errors) {
      const error = response.GetMyeBaySellingResponse.Errors;
      throw new Error(`Failed to get ItemID for SKU ${sku}: ${error.LongMessage || error.ShortMessage}`);
    }
    
    const activeList = response.GetMyeBaySellingResponse.ActiveList;
    if (!activeList || !activeList.ItemArray || !activeList.ItemArray.Item) {
      throw new Error(`No active listings found for SKU: ${sku}`);
    }
    
    const items = Array.isArray(activeList.ItemArray.Item) 
      ? activeList.ItemArray.Item 
      : [activeList.ItemArray.Item];
    
    const item = items.find(item => item.SKU === sku);
    if (!item) {
      throw new Error(`SKU ${sku} not found in active listings`);
    }
    
    console.log(`Found ItemID: ${item.ItemID} for SKU: ${sku}`);
    return item.ItemID;
    
  } catch (error) {
    console.error(`Error getting ItemID for SKU ${sku}:`, error.message);
    throw error;
  }
}

async function updateEbayStockBySku(sku, stockQuantity, accountNumber = 1) {
  try {
    console.log(`Starting SKU-based stock update for SKU: ${sku}, Quantity: ${stockQuantity} on Account ${accountNumber}`);

    const itemId = await getItemIdBySku(sku, accountNumber);
    
    if (!itemId) {
      throw new Error(`Could not find ItemID for SKU: ${sku}`);
    }
    
    console.log(`Found ItemID: ${itemId} for SKU: ${sku}, proceeding with stock update`);
    
    const result = await updateEbayStockTrading(itemId, stockQuantity, accountNumber);
    
    return {
      ...result,
      sku: sku,
      itemId: itemId,
      message: `Successfully updated stock for SKU ${sku} (ItemID: ${itemId}) to ${stockQuantity} units`
    };
    
  } catch (error) {
    console.error(`Error updating stock by SKU ${sku}:`, error.message);
    const categorizedError = categorizeTradingError(error);
    return createTradingResponse(false, `eBay${accountNumber}`, null, {
      ...categorizedError,
      step: "sku_lookup_or_update",
      sku: sku
    });
  }
}

async function sendTradingAPIRequest(xml, callName, accessToken) {
  const headers = {
    'X-EBAY-API-CALL-NAME': callName,
    'X-EBAY-API-SITEID': '0',
    'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
    'X-EBAY-API-IAF-TOKEN': accessToken
  };

  console.log(headers);

  try {
    const response = await ebayTradingAxios.post(CURRENT_API_URL, xml, { headers });
    
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);
    
    return result;
  } catch (error) {
    console.error(`Error in Trading API request (${callName}):`, error.message);
    throw error;
  }
}

async function createEbayProductTrading(product, globalRequiredFields = {}, accountNumber = 1) {
  try {
    console.log(`Starting eBay Trading API product creation for SKU: ${product.sku || "unknown"} on Account ${accountNumber}`);
    
    let token;
    switch(accountNumber) {
      case 1:
        token = await getValidAccessToken();
        break;
      case 2:
        token = await getValidAccessToken2();
        break;
      case 3:
        token = await getValidAccessToken3();
        break;
      default:
        throw new Error(`Invalid account number: ${accountNumber}. Must be 1, 2, or 3.`);
    }
    
    const xml = createAddFixedPriceItemXML(product, globalRequiredFields, token, accountNumber);
    
    console.log(`eBay${accountNumber} Trading: Creating product for SKU: ${product.sku}`);
    
    const response = await sendTradingAPIRequest(xml, 'AddFixedPriceItem', token);
    
    if (response.AddFixedPriceItemResponse && response.AddFixedPriceItemResponse.Errors) {
      const error = response.AddFixedPriceItemResponse.Errors;
      const categorizedError = {
        category: 'EBAY_TRADING_ERROR',
        code: error.ErrorCode || 'UNKNOWN',
        message: error.LongMessage || error.ShortMessage || 'Unknown eBay Trading API error',
        details: { 
          originalError: error,
          sku: product.sku,
          step: 'product_creation'
        }
      };
      
      try {
        await createNotification({
          title: `eBay${accountNumber} Trading API Product Creation Failed`,
          message: `Failed to create product for SKU: ${product.sku}. Error: ${categorizedError.message}`,
          location: `eBay Account ${accountNumber} Trading API`,
          selledBy: product.selledBy || `EBAY${accountNumber}`
        });
      } catch (notificationError) {
        console.error("Failed to create notification for product creation failure:", notificationError);
      }
      
      return createTradingResponse(false, `eBay${accountNumber}`, null, categorizedError);
    }
    
    const itemId = response.AddFixedPriceItemResponse.ItemID;
    const sku = product.sku || `SKU-${Date.now()}`;
    
    console.log(`Created eBay${accountNumber} Trading API product: ${sku}, ItemID: ${itemId}`);
    
    return createTradingResponse(true, `eBay${accountNumber}`, {
      sku,
      itemId,
      message: `Successfully created product on eBay${accountNumber} using Trading API`
    });
    
  } catch (error) {
    console.error(`Error creating eBay${accountNumber} Trading API product:`, error.message);
    const categorizedError = categorizeTradingError(error);
    return createTradingResponse(false, `eBay${accountNumber}`, null, {
      ...categorizedError,
      step: "general_error",
      sku: product.sku
    });
  }
}


async function updateEbayStockTrading(itemId, stockQuantity, accountNumber = 1) {
  try {
    console.log(`Starting eBay Trading API stock update for ItemID: ${itemId}, Quantity: ${stockQuantity} on Account ${accountNumber}`);
    
    let token;
    switch(accountNumber) {
      case 1:
        token = await getValidAccessToken();
        break;
      case 2:
        token = await getValidAccessToken2();
        break;
      case 3:
        token = await getValidAccessToken3();
        break;
      default:
        throw new Error(`Invalid account number: ${accountNumber}. Must be 1, 2, or 3.`);
    }
    
    const quantity = parseInt(stockQuantity) || 0;
    
    if (quantity === 0) {
      console.log(`Setting quantity to 0 for ItemID: ${itemId} on eBay Account ${accountNumber}`);
    }
    
    const xml = createReviseItemXML(itemId, quantity, token);
    
    console.log(`eBay${accountNumber} Trading: Updating stock for ItemID: ${itemId}`);
    
    const response = await sendTradingAPIRequest(xml, 'ReviseItem', token);
    
    if (response.ReviseItemResponse && response.ReviseItemResponse.Errors) {
      const error = response.ReviseItemResponse.Errors;
      const categorizedError = {
        category: 'EBAY_TRADING_ERROR',
        code: error.ErrorCode || 'UNKNOWN',
        message: error.LongMessage || error.ShortMessage || 'Unknown eBay Trading API error',
        details: { 
          originalError: error,
          itemId,
          step: 'stock_update'
        }
      };
      
      try {
        await createNotification({
          title: `eBay${accountNumber} Trading API Stock Update Failed`,
          message: `Failed to update stock for ItemID: ${itemId}. Error: ${categorizedError.message}`,
          location: `eBay Account ${accountNumber} Trading API`,
          selledBy: `EBAY${accountNumber}`
        });
      } catch (notificationError) {
        console.error("Failed to create notification for stock update failure:", notificationError);
      }
      
      return createTradingResponse(false, `eBay${accountNumber}`, null, categorizedError);
    }
    
    console.log(`Updated eBay${accountNumber} Trading API stock: ItemID ${itemId}, New Quantity: ${quantity}`);
    
    return createTradingResponse(true, `eBay${accountNumber}`, {
      itemId,
      newQuantity: quantity,
      message: `Successfully updated stock for ItemID ${itemId} to ${quantity} units`
    });
    
  } catch (error) {
    console.error(`Error updating eBay${accountNumber} Trading API stock:`, error.message);
    const categorizedError = categorizeTradingError(error);
    return createTradingResponse(false, `eBay${accountNumber}`, null, {
      ...categorizedError,
      step: "general_error",
      itemId
    });
  }
}


/**
 * Manual update for all eBay accounts using Trading API
 * @param {string} itemId - eBay item ID
 * @param {number} stockQuantity - New stock quantity
 * @param {string} ebayAccount - eBay account identifier ("1", "2", "3", or "all")
 * @returns {Object} Response object
 */
async function manualUpdateEbayStockTrading(itemId, stockQuantity = 0, ebayAccount = "all") {
  const results = {
    success: false,
    itemId: itemId,
    newQuantity: stockQuantity,
    platform: `eBay Trading API Account ${ebayAccount || "1, 2, 3"}`,
    accountResults: {},
    errors: [],
  };

  // Handle each account separately to provide detailed feedback
  if (ebayAccount === "all" || ebayAccount === "1") {
    try {
      results.accountResults.account1 = await updateEbayStockTrading(itemId, stockQuantity, 1);
      console.log(`eBay Account 1 Trading API updated successfully for ItemID ${itemId}`);
    } catch (error) {
      console.error(`eBay Account 1 Trading API update failed for ItemID ${itemId}:`, error.message);
      results.errors.push(`Account 1: ${error.message}`);
      results.accountResults.account1 = {
        success: false,
        error: error.message,
      };
    }
  }

  if (ebayAccount === "all" || ebayAccount === "2") {
    try {
      results.accountResults.account2 = await updateEbayStockTrading(itemId, stockQuantity, 2);
      console.log(`eBay Account 2 Trading API updated successfully for ItemID ${itemId}`);
    } catch (error) {
      console.error(`eBay Account 2 Trading API update failed for ItemID ${itemId}:`, error.message);
      results.errors.push(`Account 2: ${error.message}`);
      results.accountResults.account2 = {
        success: false,
        error: error.message,
      };
    }
  }

  if (ebayAccount === "all" || ebayAccount === "3") {
    try {
      results.accountResults.account3 = await updateEbayStockTrading(itemId, stockQuantity, 3);
      console.log(`eBay Account 3 Trading API updated successfully for ItemID ${itemId}`);
    } catch (error) {
      console.error(`eBay Account 3 Trading API update failed for ItemID ${itemId}:`, error.message);
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
    if (stockQuantity === 0) {
      results.message = `Successfully processed inventory update for ItemID ${itemId} on ${successfulAccounts.length} eBay Trading API account(s)`;
    } else {
      results.message = `Successfully updated inventory for ItemID ${itemId} to ${stockQuantity} units on ${successfulAccounts.length} eBay Trading API account(s)`;
    }
    
    if (results.errors.length > 0) {
      results.message += `. Some accounts failed: ${results.errors.join(", ")}`;
    }
  } else {
    if (stockQuantity === 0) {
      results.message = `Failed to update inventory for ItemID ${itemId} on eBay Trading API accounts: ${results.errors.join(", ")}`;
    } else {
      results.message = `Failed to update inventory for ItemID ${itemId} on eBay Trading API accounts: ${results.errors.join(", ")}`;
    }
    throw new Error(results.message);
  }

  return results;
}

module.exports = {
  createEbayProductTrading,
  updateEbayStockTrading,
  updateEbayStockBySku,
  getItemIdBySku,
  manualUpdateEbayStockTrading,
  sendTradingAPIRequest,
  createAddFixedPriceItemXML,
  createReviseItemXML,
  createGetMyeBaySellingXML
};
