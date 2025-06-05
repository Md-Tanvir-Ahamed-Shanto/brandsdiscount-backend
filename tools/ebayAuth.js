const axios = require("axios");
const querystring = require("querystring");
require("dotenv").config();
const eBayApi = require("ebay-api");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// const EBAY_AUTH_URL = "https://auth.sandbox.ebay.com/oauth2/authorize";
// const EBAY_TOKEN_URL = "https://api.sandbox.ebay.com/identity/v1/oauth2/token";

// const EBAY_CLIENT_ID = process.env.EBAY2_CLIENT_ID;
// const EBAY_CLIENT_SECRET = process.env.EBAY2_CLIENT_SECRET;
// const EBAY_REDIRECT_URI = process.env.EBAY2_REDIRECT_URI;

//PRODUCTION_KEYS!!!
const EBAY_AUTH_URL = "https://auth.ebay.com/oauth2/authorize";
const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;
const EBAY_REDIRECT_URI = process.env.EBAY_REDIRECT_URI;

// const eBay = new eBayApi({
//   appId: EBAY_CLIENT_ID,
//   certId: EBAY_CLIENT_SECRET,
//   sandbox: true,
//   siteId: eBayApi.SiteId.EBAY_US,
//   ruName: EBAY_REDIRECT_URI,
// });

// 1️⃣ Redirect User to eBay for Login
function getEbayAuthUrl() {
  const params = {
    client_id: EBAY_CLIENT_ID,
    response_type: "code",
    redirect_uri: EBAY_REDIRECT_URI,
  };

  return `${EBAY_AUTH_URL}?${querystring.stringify(params)}`;
}

// Get New Access Token Using Auth Code
async function getAccessToken(authCode) {
  console.log("getAccessToken");
  const authHeader = `Basic ${Buffer.from(
    `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`
  ).toString("base64")}`;

  console.log(authCode);
  console.log(authHeader);
  console.log(EBAY_TOKEN_URL);

  try {
    // Making the POST request to get the access token
    const response = await axios.post(
      EBAY_TOKEN_URL,
      querystring.stringify({
        grant_type: "authorization_code",
        code: authCode,
        redirect_uri: EBAY_REDIRECT_URI,
        scope:
          "https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/buy.order.readonly https://api.ebay.com/oauth/api_scope/buy.guest.order https://api.ebay.com/oauth/api_scope/sell.marketing.readonly https://api.ebay.com/oauth/api_scope/sell.marketing https://api.ebay.com/oauth/api_scope/sell.inventory.readonly https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account.readonly https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.analytics.readonly https://api.ebay.com/oauth/api_scope/sell.marketplace.insights.readonly https://api.ebay.com/oauth/api_scope/commerce.catalog.readonly https://api.ebay.com/oauth/api_scope/buy.shopping.cart https://api.ebay.com/oauth/api_scope/buy.offer.auction https://api.ebay.com/oauth/api_scope/commerce.identity.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.email.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.phone.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.address.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.name.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.status.readonly https://api.ebay.com/oauth/api_scope/sell.finances https://api.ebay.com/oauth/api_scope/sell.payment.dispute https://api.ebay.com/oauth/api_scope/sell.item.draft https://api.ebay.com/oauth/api_scope/sell.item https://api.ebay.com/oauth/api_scope/sell.reputation https://api.ebay.com/oauth/api_scope/sell.reputation.readonly https://api.ebay.com/oauth/api_scope/commerce.notification.subscription https://api.ebay.com/oauth/api_scope/commerce.notification.subscription.readonly https://api.ebay.com/oauth/api_scope/sell.stores https://api.ebay.com/oauth/api_scope/sell.stores.readonly",
      }),
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 90000,
      }
    );

    const expiresAt = new Date(Date.now() + response.data.expires_in * 1000); // Convert to Date object

    const ebayApiData = await prisma.apiToken.upsert({
      where: { platform: "EBAY" }, // Check if an entry for "EBAY" exists
      update: {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: expiresAt,
      }, // Update if found
      create: {
        platform: "EBAY",
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: expiresAt,
      }, // Create if not found
    });

    console.log(ebayApiData);

    console.log(ebayApiData);

    return response.data;
  } catch (error) {
    console.log("error");
    console.log(error);
    // Log the error response from eBay
    if (error.response) {
      // eBay returned an error (e.g., invalid code, expired token, etc.)
      console.error("Error response from eBay:", error.response.data);
      console.error("Error status from eBay:", error.response.status);
    } else if (error.request) {
      // Request was made, but no response was received
      console.error("No response received:", error.request);
    } else {
      // Something else went wrong
      console.error("Error during request setup:", error.message);
    }

    throw new Error("Failed to get access token from eBay");
  }
}

// async function getAccessToken(authCode) {
//   //   const authCode2 = decodeURIComponent(authCode);

//   const token = await eBay.oAuth2.getToken(authCode);
//   console.log(token);
//   return token;
// }

// Use Refresh Token to Get a New Access Token
async function refreshAccessToken() {
  const refreshToken = await prisma.apiToken.findUnique({
    where: {
      platform: "EBAY",
    },
  });
  console.log(refreshToken);

  if (!refreshToken) {
    throw new Error("No refresh token found");
  }

  const authHeader = `Basic ${Buffer.from(
    `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`
  ).toString("base64")}`;

  // const response = await axios.post(
  //   EBAY_TOKEN_URL,
  //   querystring.stringify({
  //     grant_type: "refresh_token",
  //     refresh_token: refreshToken.refreshToken,
  //     scope:
  //       "https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/buy.order.readonly https://api.ebay.com/oauth/api_scope/buy.guest.order https://api.ebay.com/oauth/api_scope/sell.marketing.readonly https://api.ebay.com/oauth/api_scope/sell.marketing https://api.ebay.com/oauth/api_scope/sell.inventory.readonly https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account.readonly https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.analytics.readonly https://api.ebay.com/oauth/api_scope/sell.marketplace.insights.readonly https://api.ebay.com/oauth/api_scope/commerce.catalog.readonly https://api.ebay.com/oauth/api_scope/buy.shopping.cart https://api.ebay.com/oauth/api_scope/buy.offer.auction https://api.ebay.com/oauth/api_scope/commerce.identity.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.email.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.phone.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.address.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.name.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.status.readonly https://api.ebay.com/oauth/api_scope/sell.finances https://api.ebay.com/oauth/api_scope/sell.payment.dispute https://api.ebay.com/oauth/api_scope/sell.item.draft https://api.ebay.com/oauth/api_scope/sell.item https://api.ebay.com/oauth/api_scope/sell.reputation https://api.ebay.com/oauth/api_scope/sell.reputation.readonly https://api.ebay.com/oauth/api_scope/commerce.notification.subscription https://api.ebay.com/oauth/api_scope/commerce.notification.subscription.readonly https://api.ebay.com/oauth/api_scope/sell.stores https://api.ebay.com/oauth/api_scope/sell.stores.readonly",
  //   }),
  //   {
  //     headers: {
  //       Authorization: authHeader,
  //       "Content-Type": "application/x-www-form-urlencoded",
  //     },
  //   }
  // );

  // const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);
  try {
    const response = await axios.post(
      EBAY_TOKEN_URL,
      querystring.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken.refreshToken,
        // scope:
        //   "https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/buy.order.readonly https://api.ebay.com/oauth/api_scope/buy.guest.order https://api.ebay.com/oauth/api_scope/sell.marketing.readonly https://api.ebay.com/oauth/api_scope/sell.marketing https://api.ebay.com/oauth/api_scope/sell.inventory.readonly https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account.readonly https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.analytics.readonly https://api.ebay.com/oauth/api_scope/sell.marketplace.insights.readonly https://api.ebay.com/oauth/api_scope/commerce.catalog.readonly https://api.ebay.com/oauth/api_scope/buy.shopping.cart https://api.ebay.com/oauth/api_scope/buy.offer.auction https://api.ebay.com/oauth/api_scope/commerce.identity.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.email.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.phone.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.address.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.name.readonly https://api.ebay.com/oauth/api_scope/commerce.identity.status.readonly https://api.ebay.com/oauth/api_scope/sell.finances https://api.ebay.com/oauth/api_scope/sell.payment.dispute https://api.ebay.com/oauth/api_scope/sell.item.draft https://api.ebay.com/oauth/api_scope/sell.item https://api.ebay.com/oauth/api_scope/sell.reputation https://api.ebay.com/oauth/api_scope/sell.reputation.readonly https://api.ebay.com/oauth/api_scope/commerce.notification.subscription https://api.ebay.com/oauth/api_scope/commerce.notification.subscription.readonly https://api.ebay.com/oauth/api_scope/sell.stores https://api.ebay.com/oauth/api_scope/sell.stores.readonly",
      }),
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);
    const tokenUpdate = await prisma.apiToken.update({
      where: { platform: "EBAY" },
      data: {
        platform: "EBAY",
        accessToken: response.data.access_token,
        refreshToken: refreshToken.refreshToken,
        expiresAt: expiresAt,
      },
    });
    return response.data.access_token;
  } catch (error) {
    console.log("error", error);
  }
}

// Get a Valid Access Token (Refresh if Needed)
async function getValidAccessToken() {
  const token = await prisma.apiToken.findUnique({
    where: {
      platform: "EBAY",
    },
  });
  if (token.accessToken && Date.now() < token.expiresAt) {
    return token.accessToken;
  }
  return await refreshAccessToken();
}

// async function ebayUpdateInventory(sku, quantity) {
//   const token = await getValidAccessToken();

//   try {
//     const offerId = await axios.get(
//       `https://api.ebay.com/sell/inventory/v1/offer?sku=${sku}`,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           Accept: "application/json",
//         },
//       }
//     );

//     const reqBody = {
//       requests: [
//         {
//           offers: [
//             {
//               availableQuantity: quantity,
//               offerId: offerId,
//             },
//           ],
//           shipToLocationAvailability: {
//             availabilityDistributions: [
//               {
//                 fulfillmentTime: {
//                   unit: "DAY",
//                   value: 3,
//                 },
//                 merchantLocationKey: "mk1",
//                 quantity: quantity,
//               },
//             ],
//             quantity: quantity,
//           },
//           sku: sku,
//         },
//       ],
//     };

//     const newInventory = await axios.put(
//       "https://api.ebay.com/sell/inventory/v1/bulk_update_price_quantity",
//       reqBody,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//           Accept: "application/json",
//         },
//       }
//     );
//   } catch (error) {
//     console.log("ebay item update error", error);
//   }
// }

// async function ebayOrderSync() {
//   const token = await getValidAccessToken();

//   try {
//     const now = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // Subtract 5 minutes and convert to ISO

//     const url = `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:%5B${now}..%5D&limit=180`;
//     // const url = `https://marketplace.walmartapis.com/v3/orders?status=Created&productInfo=false&shipNodeType=SellerFulfilled&replacementInfo=false&createdStartDate=${encodeURIComponent(
//     //   now
//     // )}`;

//     const headers = {
//       Authorization: `Bearer ${token}`,
//       "Content-Type": "application/json",
//     };

//     const response = await axios.get(url, { headers });
//     const data = response.data;
//     const existingOrders = await prisma.ebayOrder.findMany();
//     console.log("exisitng orders", existingOrders);
//     const newOrders = data.orders.filter(
//       (order) =>
//         !existingOrders.find((existing) => existing.orderId === order.orderId)
//     );

//     console.log(`new ordersssss`, newOrders);

//     const clearDB = await prisma.ebayOrder.deleteMany({});
//     const createOrders = await prisma.ebayOrder.createMany({
//       data: newOrders.map((order) => ({
//         orderId: order.orderId,
//         orderCreationDate: new Date(order.creationDate),
//         status: order.orderFulfillmentStatus,
//       })),
//     });
//     console.log(`new ordersssss222222`, newOrders);

//     newOrders.forEach(async (order) => {
//       order.lineItems.forEach(async (item) => {
//         console.log("syncing order:", order);
//         const productData = await prisma.product.findUnique({
//           where: {
//             sku: item.sku,
//           },
//         });
//         if (productData) {
//           const updateProduct = await prisma.product.update({
//             where: {
//               sku: item.sku,
//             },
//             data: {
//               stockQuantity: productData.stockQuantity - item.quantity,
//             },
//           });
//           ebayInventorySync2(
//             item.sku,
//             productData.stockQuantity - item.quantity,
//             getValidAccessToken
//           );
//         }
//       });
//     });
//     return newOrders;
//   } catch (error) {
//     console.error(
//       "Error fetching Walmart orders:",
//       error.response?.data || error.message
//     );
//     console.log(error);
//   }
// }

// async function ebayInventorySync(sku, quantity, getValidAccessToken) {
//   await ebayUpdateInventory(sku, quantity, getValidAccessToken);
// }

// async function createEbayProduct({ title, price, sku, quantity, ebayAuth }) {
//   const EBAY_SANDBOX_URL = "https://api.sandbox.ebay.com";
//   // const EBAY_SANDBOX_URL = "https://api.ebay.com";
//   try {
//     const token = await getValidAccessToken();
//     if (!token) throw new Error("Failed to get eBay token");

//     // Step 1: Create Inventory Item
//     await axios.put(
//       `${EBAY_SANDBOX_URL}/sell/inventory/v1/inventory_item/${sku}`,
//       {
//         product: {
//           title,
//           description: "Test product for eBay API",
//           brand: "Generic",
//           aspects: { Brand: ["Generic"] },
//           imageUrls: ["https://via.placeholder.com/300"],
//           ean: [],
//           mpn: "ss453",
//           upc: [],
//         },
//         availability: {
//           shipToLocationAvailability: {
//             availabilityDistributions: [
//               {
//                 availabilityType: "IN_STOCK",
//                 fulfillmentTime: {
//                   unit: "BUSINESS_DAY",
//                   value: 2,
//                 },
//                 merchantLocationKey: "mk1",
//                 quantity,
//               },
//             ],
//             quantity,
//           },
//           pickupAtLocationAvailability: [
//             {
//               availabilityType: "IN_STOCK",
//               fulfillmentTime: {
//                 unit: "DAY",
//                 value: 1,
//               },
//               merchantLocationKey: "mk1",
//               quantity,
//             },
//           ],
//         },
//         condition: "NEW",
//         conditionDescription: "Brand new item in excellent condition",
//         conditionDescriptors: [
//           {
//             name: "Package Condition",
//             additionalInfo: "Item is in original packaging.",
//             values: ["Brand New"],
//           },
//         ],
//         packageWeightAndSize: {
//           weight: {
//             unit: "KILOGRAM",
//             value: 88,
//           },
//           shippingIrregular: false,
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//           "Content-Language": "en-US",
//         },
//       }
//     );

//     // Step 2: Create Offer
//     const offerResponse = await axios.post(
//       `${EBAY_SANDBOX_URL}/sell/inventory/v1/offer`,
//       {
//         sku,
//         marketplaceId: "EBAY_US",
//         categoryId: "162925",
//         format: "FIXED_PRICE",
//         merchantLocationKey: "mk1",
//         listingDuration: "GTC",
//         listingDescription:
//           "<ul><li><p>Test listing - do not bid or buy&nbsp;</p></li><li><p>Built-in GPS.&nbsp;</p></li><li><p>Water resistance to 50 meters.</p></li><li><p>Dual-core processor.&nbsp;</p></li><li><p>Bright display.&nbsp;</p></li><li><p>Apple Watch Series 2 designed for all movements</p></li></ul>",
//         availableQuantity: quantity,
//         quantityLimitPerBuyer: 10,
//         listingPolicies: {
//           paymentPolicyId: "6208689000",
//           returnPolicyId: "6208690000",
//           fulfillmentPolicyId: "6208688000",
//         },
//         pricingSummary: {
//           price: {
//             currency: "USD",
//             value: price,
//           },
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//           "Content-Language": "en-US",
//         },
//       }
//     );

//     const offerId = offerResponse.data.offerId;

//     // Step 3: Publish the Listing
//     const publishing = await axios.post(
//       `${EBAY_SANDBOX_URL}/sell/inventory/v1/offer/${offerId}/publish`,
//       {},
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//           "Content-Language": "en-US",
//         },
//       }
//     );

//     return {
//       success: true,
//       message: "Product created and published successfully",
//       offerId,
//       publishResponse: publishing.data,
//     };
//   } catch (error) {
//     const errorDetails = error.response?.data || error.message;
//     console.error("eBay API Error:", errorDetails);
//     throw new Error(
//       `Failed to create product on eBay: ${JSON.stringify(errorDetails)}`
//     );
//   }
// }

/**
 * Creates a product on eBay through their Inventory API
 */
async function createEbayProduct(productData) {
  try {
    // Get eBay API token
    const token = await getValidAccessToken();
    if (!token) {
      res.status(500).json({ error: "Failed to get eBay token" });
      return;
    }

    // Process the category ID
    const ebayCategoryId = productData.categoryId || "155201"; // Default category if not provided

    // 1. Fetch category aspects from eBay API
    const aspects = await fetchCategoryAspects(token, ebayCategoryId);

    // 2. Create inventory item
    await createInventoryItem(token, productData, aspects);

    // 3. Create offer for listing
    const offerId = await createOffer(token, productData, ebayCategoryId);

    // 4. Publish the listing
    await publishListing(token, offerId);

    res.json({
      success: true,
      message: "Product created successfully",
      offerId,
    });
  } catch (error) {
    console.error(
      "Error creating eBay product:",
      error.response?.data?.parameters
        ? JSON.stringify(error.response.data.parameters)
        : error.message
    );
    console.log(JSON.stringify(error));
    res.status(500).json({ error: "Failed to create product on eBay" });
  }
}

/**
 * Fetches category aspects from eBay API
 * @param {string} token - Valid eBay API token
 * @param {string} categoryId - eBay category ID
 * @returns {Object} Processed aspects object
 */
async function fetchCategoryAspects(token, categoryId) {
  const excludedAspects = ["size", "brand", "color", "style"];

  try {
    const response = await axios.get(
      `${process.env.EBAY_PRODUCTION_URL}/commerce/taxonomy/v1/category_tree/0/get_item_aspects_for_category?category_id=${categoryId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US",
        },
      }
    );

    // Process and filter aspects
    return response.data.aspects.reduce((acc, value) => {
      const name = value.localizedAspectName?.toLowerCase();
      if (!name || excludedAspects.includes(name)) return acc;
      return { ...acc, [value.localizedAspectName]: ["ㅤ"] };
    }, {});
  } catch (error) {
    console.error("Error fetching category aspects:", error.message);
    // Return empty aspects object if there's an error
    return {};
  }
}

/**
 * Creates an inventory item on eBay
 * @param {string} token - Valid eBay API token
 * @param {Object} productData - Product data from request
 * @param {Object} aspects - Processed category aspects
 * @returns {Promise} Result of the API call
 */
async function createInventoryItem(token, productData, aspects) {
  const {
    title,
    sku,
    quantity,
    size,
    type,
    description,
    brand,
    imageUrls,
    condition,
    color,
  } = productData;

  return axios.put(
    `${process.env.EBAY_PRODUCTION_URL}/sell/inventory/v1/inventory_item/${sku}`,
    {
      product: {
        title,
        style: "ㅤ",
        color,
        size,
        type,
        description,
        brand,
        aspects,
        imageUrls,
        ean: [],
        mpn: "ss453", // Consider making this dynamic
        upc: [],
      },
      availability: {
        shipToLocationAvailability: {
          availabilityDistributions: [
            {
              availabilityType: "IN_STOCK",
              fulfillmentTime: {
                unit: "BUSINESS_DAY",
                value: 2,
              },
              merchantLocationKey: "mk1",
              quantity,
            },
          ],
          quantity,
        },
        pickupAtLocationAvailability: [
          {
            availabilityType: "IN_STOCK",
            fulfillmentTime: {
              unit: "DAY",
              value: 1,
            },
            merchantLocationKey: "mk1",
            quantity,
          },
        ],
      },
      condition,
      conditionDescription: "Brand new item in excellent condition",
      conditionDescriptors: [
        {
          name: "Package Condition",
          additionalInfo: "Item is in original packaging.",
          values: "ㅤ",
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Language": "en-US",
      },
    }
  );
}

/**
 * Creates an offer for the inventory item
 * @param {string} token - Valid eBay API token
 * @param {Object} productData - Product data from request
 * @param {string} categoryId - eBay category ID
 * @returns {string} eBay offer ID
 */
async function createOffer(token, productData, categoryId) {
  const { sku, quantity, price } = productData;

  const response = await axios.post(
    `${process.env.EBAY_PRODUCTION_URL}/sell/inventory/v1/offer`,
    {
      sku,
      marketplaceId: "EBAY_US",
      categoryId,
      format: "FIXED_PRICE",
      merchantLocationKey: "US-SAMPLEDEALS-WH1",
      listingDuration: "GTC",
      listingDescription:
        '<ul><li><font face="Arial"><span style="font-size: 18.6667px;"><p class="p1">Test listing - do not bid or buy&nbsp;</p></span></font></li><li><p class="p1">Built-in GPS.&nbsp;</p></li><li><p class="p1">Water resistance to 50 meters.</p></li><li><p class="p1">&nbsp;A new lightning-fast dual-core processor.&nbsp;</p></li><li><p class="p1">And a display that\u2019s two times brighter than before.&nbsp;</p></li><li><p class="p1">Full of features that help you stay active, motivated, and connected, Apple Watch Series 2 is designed for all the ways you move</p></li></ul>',
      availableQuantity: quantity,
      quantityLimitPerBuyer: 2,
      listingPolicies: {
        paymentPolicyId: "243417962010",
        returnPolicyId: "243417673010",
        fulfillmentPolicyId: "243417625010",
      },
      pricingSummary: {
        price: {
          currency: "USD",
          value: price,
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Language": "en-US",
      },
    }
  );

  return response.data.offerId;
}

/**
 * Publishes the offer (listing) on eBay
 * @param {string} token - Valid eBay API token
 * @param {string} offerId - eBay offer ID to publish
 * @returns {Promise} Result of the API call
 */
async function publishListing(token, offerId) {
  return axios.post(
    `${process.env.EBAY_PRODUCTION_URL}/sell/inventory/v1/offer/${offerId}/publish`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Language": "en-US",
      },
    }
  );
}

module.exports = {
  getEbayAuthUrl,
  getAccessToken,
  refreshAccessToken,
  getValidAccessToken,
  createEbayProduct,
  createEbayProduct,
};
