const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { verifyUser } = require("../tools/authenticate");
const { ensureRoleAdmin } = require("../tools/tools.js");

const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const ebayAuth = require("../tools/ebayAuth3.js");

const prisma = new PrismaClient();

const EBAY_SANDBOX_URL = "https://api.sandbox.ebay.com";

// 1️⃣ Route to start eBay OAuth flow
router.get("/auth", verifyUser, ensureRoleAdmin, (req, res) => {
  res.redirect(ebayAuth.getEbayAuthUrl());
});

// 2️⃣ Callback route (handles eBay OAuth response)
router.get("/auth/callback", async (req, res) => {
  console.log("ebay callback");
  const authCode = req.query.code;
  if (!authCode) return res.status(400).send("Authorization code missing");

  try {
    const tokens = await ebayAuth.getAccessToken(authCode);
    console.log("tokens", tokens);
    res.json({ success: true, tokens });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to get access token", details: error.message });
  }
});

router.post("/create-product", async (req, res) => {
  const { title, price, sku, quantity } = req.body;
  console.log(req.body);

  console.log("quantity");
  console.log(quantity);
  console.log(title);

  const token = await ebayAuth.getValidAccessToken();
  if (!token)
    return res.status(500).json({ error: "Failed to get eBay token" });

  // const createFulfillmentPolicy = async (token) => {
  //   try {
  //     const response = await axios.post(
  //       `https://api.sandbox.ebay.com/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US`,
  //       {
  //         // Provide the body data for creating the fulfillment policy
  //         name: "Standard Shipping Policy", // Name of your policy
  //         shipping: {
  //           shippingService: "USPS_PRIORITY_MAIL", // Example shipping service
  //           cost: {
  //             currency: "USD",
  //             value: 5.0, // Shipping cost (if applicable)
  //           },
  //         },
  //         returnAccepted: true, // Set whether returns are accepted
  //         shippingDuration: "CALENDAR_DAY_1", // Shipping duration (1 day)
  //       },
  //       {
  //         headers: {
  //           Authorization: `Bearer ${token}`, // Ensure you pass the token here
  //           "Content-Type": "application/json", // Set content type
  //         },
  //       }
  //     );

  //     // Get the fulfillment policy ID from the response
  //     const fulfillmentPolicyId = response.data.fulfillmentPolicyId;
  //     console.log("Fulfillment Policy Created:", fulfillmentPolicyId);

  //     return fulfillmentPolicyId; // You can use this ID for your listings
  //   } catch (error) {
  //     console.error(
  //       "Error creating fulfillment policy:",
  //       error.response?.data || error.message
  //     );
  //     throw new Error("Failed to create fulfillment policy.");
  //   }
  // };

  // Function to get eBay inventory items with pagination support (limit and offset)
  // const getInventoryItems = async (token, limit = 10, offset = 0) => {
  //   try {
  //     const response = await axios.get(
  //       `https://api.sandbox.ebay.com/sell/inventory/v1/inventory_item`,
  //       {
  //         params: {
  //           limit: limit, // Optional: number of items to fetch per request (default is 10)
  //           offset: offset, // Optional: the number of items to skip for pagination (default is 0)
  //         },
  //         headers: {
  //           Authorization: `Bearer ${token}`, // Provide your access token
  //           "Content-Type": "application/json", // Set the content type
  //         },
  //       }
  //     );

  //     // Handle the response data
  //     // console.log("Inventory Items:", response.data);
  //     return response.data;
  //   } catch (error) {
  //     console.error(
  //       "Error fetching inventory items:",
  //       error.response?.data || error.message
  //     );
  //     throw new Error("Failed to fetch inventory items");
  //   }
  // };

  try {
    // Step 2.1: Create Inventory Item
    const newInventory = await axios.put(
      `${EBAY_SANDBOX_URL}/sell/inventory/v1/inventory_item/${sku}`,
      {
        product: {
          title: title,
          description: "Test product for eBay API", // Add dynamic description if needed
          brand: "Generic", // Add dynamic brand if needed
          aspects: {
            Brand: ["Generic"],
          },
          imageUrls: ["https://via.placeholder.com/300"], // Replace with actual image URL if available
          ean: [], // Replace with product's EAN if available
          mpn: "ss453", // Replace with product's MPN if available
          upc: [], // Replace with product's UPC if available
        },
        // Availability details
        availability: {
          shipToLocationAvailability: {
            availabilityDistributions: [
              {
                availabilityType: "IN_STOCK", // Modify availability type as needed
                fulfillmentTime: {
                  unit: "BUSINESS_DAY", // Modify unit if needed (e.g., BUSINESS_DAY, CALENDAR_DAY)
                  value: 2, // Modify fulfillment time (e.g., 1 day)
                },
                merchantLocationKey: "mk1", // Add merchant location key if needed
                quantity: quantity, // Modify as needed
              },
            ],
            quantity: quantity, // Quantity available for shipping
          },
          pickupAtLocationAvailability: [
            {
              availabilityType: "IN_STOCK", // Modify availability type as needed
              fulfillmentTime: {
                unit: "DAY", // Modify unit if needed (e.g., BUSINESS_DAY, CALENDAR_DAY)
                value: 1, // Modify fulfillment time (e.g., 1 day)
              },
              merchantLocationKey: "mk1", // Add merchant location key if needed
              quantity: quantity, // Modify as needed
            },
          ],
        },
        // Condition of the product
        condition: "NEW", // Modify based on product condition
        conditionDescription: "Brand new item in excellent condition", // Modify if needed
        conditionDescriptors: [
          {
            name: "Package Condition",
            additionalInfo: "Item is in original packaging.",
            values: ["Brand New"],
          },
        ],
        // Package weight and size details
        packageWeightAndSize: {
          weight: {
            unit: "KILOGRAM", // Modify weight unit (POUND, GRAM, etc.)
            value: 88, // Replace with actual weight
          },
          //   packageType: "MAILING_BOX", // Modify package type as needed
          shippingIrregular: false, // Set to true if the package is irregularly shaped
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
    console.log(newInventory.status);

    // createFulfillmentPolicy(token);

    // Step 2.2: Create Offer for Listing
    const offerResponse = await axios.post(
      `${EBAY_SANDBOX_URL}/sell/inventory/v1/offer`,
      {
        sku: sku,
        marketplaceId: "EBAY_US",
        categoryId: "162925",
        format: "FIXED_PRICE",
        merchantLocationKey: "mk1",
        listingDuration: "GTC",
        listingDescription:
          '<ul><li><font face="Arial"><span style="font-size: 18.6667px;"><p class="p1">Test listing - do not bid or buy&nbsp;</p></span></font></li><li><p class="p1">Built-in GPS.&nbsp;</p></li><li><p class="p1">Water resistance to 50 meters.</p></li><li><p class="p1">&nbsp;A new lightning-fast dual-core processor.&nbsp;</p></li><li><p class="p1">And a display that\u2019s two times brighter than before.&nbsp;</p></li><li><p class="p1">Full of features that help you stay active, motivated, and connected, Apple Watch Series 2 is designed for all the ways you move</p></li></ul>',

        availableQuantity: quantity,
        quantityLimitPerBuyer: 10,
        listingPolicies: {
          paymentPolicyId: "6208689000",
          returnPolicyId: "6208690000",
          fulfillmentPolicyId: "6208688000",
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

    const offerId = offerResponse.data.offerId;

    console.log("offerId");
    console.log(offerId);
    // const inventoryData = await getInventoryItems(token);
    // console.log("inventoryData");
    // console.log(inventoryData);

    // Step 2.3: Publish the Listing
    const publishing = await axios.post(
      `${EBAY_SANDBOX_URL}/sell/inventory/v1/offer/${offerId}/publish`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US",
        },
      }
    );
    console.log("publishing");
    console.log(publishing);

    res.json({ success: true, message: "Product created successfully" });
  } catch (error) {
    console.error(
      "Error creating eBay product:",
      JSON.stringify(error.response?.data?.parameters) || error.message
    );
    console.log(JSON.stringify(error));
    res.status(500).json({ error: "Failed to create product on eBay" });
  }
});

// Route to initiate guest checkout
router.post("/initiate-guest-checkout", async (req, res) => {
  try {
    const accessToken = await ebayAuth.getValidAccessToken();
    if (!accessToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Missing access token" });
    }

    const deviceId = uuidv4(); // Generate a unique device ID
    console.log(deviceId);

    const headers = {
      Authorization:
        "Bearer v^1.1#i^1#r^0#f^0#I^3#p^1#t^H4sIAAAAAAAA/+VYe2wURRjv3bXFBotYFAhRc1kkYOvu7bN3t3In1wdQW9rSO45eCda53bl26T6OfdAeBtM2AiaYQFRQIxBMTUANqSISUIMtEkDjIxKMkWgwGJSYaEUTwUYSZ6+lXCvh1Uts4v6zmZlvvvn9fvN9M98u2ZlfULxh8YaLhY5Jzl2dZKfT4aAmkwX5eSVTXM5ZeTlkhoFjV+eDnbndrvPzDaDISb4BGklNNaC7Q5FVg093BjBLV3kNGJLBq0CBBm8KfDi0pIanCZJP6pqpCZqMuasqAhiAVJymoMB4E8ArJCjUq17xGdECWCnt53w+SALg8wterx+NG4YFq1TDBKoZwGiS5nCSwWkqQlE8SfMMS1AM1YS5o1A3JE1FJgSJBdNw+fRcPQPr9aECw4C6iZxgwarQwnBdqKqisjYy35PhKzisQ9gEpmWMbpVrInRHgWzB6y9jpK35sCUI0DAwT3BohdFO+dAVMLcBPy11HIreOOXjWLGUBcALsiLlQk1XgHl9HHaPJOKJtCkPVVMyUzdSFKkRXwUFc7hVi1xUVbjt11ILyFJCgnoAqywLxUL19ViwuhVIuiWX4TWaAORWzcDDZY046xM4SAOOw70i6WUZlhteaMjbsMxjVirXVFGyRTPctZpZBhFqOFobkucytEFGdWqdHkqYNqJMO+aKhjTbZG/q0C5aZqtq7ytUkBDudPPGOzAy2zR1KW6ZcMTD2IG0RCitkklJxMYOpmNxOHw6jADWappJ3uNpb28n2hlC01s8NElSnsYlNWGhFSooQjoUO9eH7KUbT8ClNBUBopmGxJupJMLSgWIVAVBbsCDLUpSfHdZ9NKzg2N5/dWRw9ozOiGxliJeOMz6a4VhKTDClgpCNDAkOB6nHxgHjIIUrQG+DZlIGAsQFFGeWAnVJ5BkuQTO+BMTFUn8CZ/2JBB7nxFKcSkBIQhiPC37f/ylRbjbUw1DQoZmVWM9anDdWL1WWtdU2KctrYiUNXDTSGGH0SoGETeLyRRW0h2RojqQafBZYGrjZbLgm+XJZQspE0PrZEMDO9eyJsFgzTCiOi15Y0JKwXpMlITWxNpjRxXqgm6kyK4XaYSjL6DUuqqFksio7J3bWSN7iYXF7vLN3U/1Ht9Q1WRl24E4sVvZ8AzkASYlA95Cd6ylC0BSPBlARYnc3p1F74laKaLGgYaJFRKiPSwcJ1bMTSgVE2GafIiRxqBAl0vQJY41A6NDQLB3V4ESdXZdFtDaoolvO1DVZhnqUGnd+K4plgrgMJ1qiZyHgJTDBrmDKy9Icx/q58fES0hds80Q7om7taM5dmdVi2zP60z+Yk36obscnZLfjmNPhICtInCohH8p3Lct13YkZkgkJA6hiXOsgJJAgDKlFRV+2OiTaYCqJmDin5Zz6eUs49mX1wW2H167uIh49llOQ8Qdi10py5sg/iAIXNTnjhwR539WRPOquGYWotGJoiqJImmGbyNlXR3Op6bn3bPXXfndo59M9939bTs5gXoS/Wbu3kIUjRg5HXk5utyMnOTDoevzS5g8vr4jN6TnM99MPxP6c/unxosq5b65Ren6cMvDV8Qb4cvnZA4O/ziad35x8d0+R79JgLBJ+vnD2hdow07/tzP6XjvYu2RxLVfUWf1BW1HwgBlzr8KJJbZMfy3+mdsvW3Drn6387D93d1/zxaaLryPpovP30ic6NO++aFd2pqOb+P/rWL9w7tXj77wv6/9Lu3XQq0fj2C+fJRy4XBzc+pZwJ914IvvrexUV39Jzfd3lKc/G0rU+qO/YumPNZfv+Jnn27B1ed3fP5ufcXzF27/blnTx4caHpn3k/R1V+v+KjkeN+6eV1np3b9sj3y2vc7Hv4hUNn3xrlX3vpCmTnQyz8RrU65jlYeITYN7ek/dSWPLhsSAAA=",
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      "X-EBAY-C-ENDUSERCTX": `deviceId=${deviceId}`,
      "Content-Type": "application/json",
    };

    const payload = {
      contactEmail: "kb@gmail.com",
      shippingAddress: {
        recipient: {
          firstName: "testr",
          lastName: "testw",
        },
        phoneNumber: "9173310324",
        addressLine1: "8 The Green",
        city: "Dover",
        stateOrProvince: "DE",
        postalCode: "19901",
        country: "US",
      },
      lineItemInputs: [
        {
          quantity: "1",
          itemId: "v1|110578486495|0",
        },
      ],
    };

    const response = await axios.post(
      "https://apix.sandbox.ebay.com/buy/order/v2/guest_checkout_session/initiate",
      payload,
      { headers }
    );
    console.log(response);

    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "Error initiating guest checkout:",
      error.response?.data || error.message
    );
    res.status(error.response?.status || 500).json({
      error: error.response?.data || "Internal Server Error",
    });
  }
});

// GET route to fetch guest checkout session details
router.get("/guest-checkout/:checkoutSessionId", async (req, res) => {
  try {
    const { checkoutSessionId } = req.params;
    const accessToken = await ebayAuth.getValidAccessToken();
    if (!accessToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Missing access token" });
    }

    const headers = {
      Authorization:
        "Bearer v^1.1#i^1#r^0#f^0#I^3#p^1#t^H4sIAAAAAAAA/+VYe2wURRjv3bXFBotYFAhRc1kkYOvu7bN3t3In1wdQW9rSO45eCda53bl26T6OfdAeBtM2AiaYQFRQIxBMTUANqSISUIMtEkDjIxKMkWgwGJSYaEUTwUYSZ6+lXCvh1Uts4v6zmZlvvvn9fvN9M98u2ZlfULxh8YaLhY5Jzl2dZKfT4aAmkwX5eSVTXM5ZeTlkhoFjV+eDnbndrvPzDaDISb4BGklNNaC7Q5FVg093BjBLV3kNGJLBq0CBBm8KfDi0pIanCZJP6pqpCZqMuasqAhiAVJymoMB4E8ArJCjUq17xGdECWCnt53w+SALg8wterx+NG4YFq1TDBKoZwGiS5nCSwWkqQlE8SfMMS1AM1YS5o1A3JE1FJgSJBdNw+fRcPQPr9aECw4C6iZxgwarQwnBdqKqisjYy35PhKzisQ9gEpmWMbpVrInRHgWzB6y9jpK35sCUI0DAwT3BohdFO+dAVMLcBPy11HIreOOXjWLGUBcALsiLlQk1XgHl9HHaPJOKJtCkPVVMyUzdSFKkRXwUFc7hVi1xUVbjt11ILyFJCgnoAqywLxUL19ViwuhVIuiWX4TWaAORWzcDDZY046xM4SAOOw70i6WUZlhteaMjbsMxjVirXVFGyRTPctZpZBhFqOFobkucytEFGdWqdHkqYNqJMO+aKhjTbZG/q0C5aZqtq7ytUkBDudPPGOzAy2zR1KW6ZcMTD2IG0RCitkklJxMYOpmNxOHw6jADWappJ3uNpb28n2hlC01s8NElSnsYlNWGhFSooQjoUO9eH7KUbT8ClNBUBopmGxJupJMLSgWIVAVBbsCDLUpSfHdZ9NKzg2N5/dWRw9ozOiGxliJeOMz6a4VhKTDClgpCNDAkOB6nHxgHjIIUrQG+DZlIGAsQFFGeWAnVJ5BkuQTO+BMTFUn8CZ/2JBB7nxFKcSkBIQhiPC37f/ylRbjbUw1DQoZmVWM9anDdWL1WWtdU2KctrYiUNXDTSGGH0SoGETeLyRRW0h2RojqQafBZYGrjZbLgm+XJZQspE0PrZEMDO9eyJsFgzTCiOi15Y0JKwXpMlITWxNpjRxXqgm6kyK4XaYSjL6DUuqqFksio7J3bWSN7iYXF7vLN3U/1Ht9Q1WRl24E4sVvZ8AzkASYlA95Cd6ylC0BSPBlARYnc3p1F74laKaLGgYaJFRKiPSwcJ1bMTSgVE2GafIiRxqBAl0vQJY41A6NDQLB3V4ESdXZdFtDaoolvO1DVZhnqUGnd+K4plgrgMJ1qiZyHgJTDBrmDKy9Icx/q58fES0hds80Q7om7taM5dmdVi2zP60z+Yk36obscnZLfjmNPhICtInCohH8p3Lct13YkZkgkJA6hiXOsgJJAgDKlFRV+2OiTaYCqJmDin5Zz6eUs49mX1wW2H167uIh49llOQ8Qdi10py5sg/iAIXNTnjhwR539WRPOquGYWotGJoiqJImmGbyNlXR3Op6bn3bPXXfndo59M9939bTs5gXoS/Wbu3kIUjRg5HXk5utyMnOTDoevzS5g8vr4jN6TnM99MPxP6c/unxosq5b65Ren6cMvDV8Qb4cvnZA4O/ziad35x8d0+R79JgLBJ+vnD2hdow07/tzP6XjvYu2RxLVfUWf1BW1HwgBlzr8KJJbZMfy3+mdsvW3Drn6387D93d1/zxaaLryPpovP30ic6NO++aFd2pqOb+P/rWL9w7tXj77wv6/9Lu3XQq0fj2C+fJRy4XBzc+pZwJ914IvvrexUV39Jzfd3lKc/G0rU+qO/YumPNZfv+Jnn27B1ed3fP5ufcXzF27/blnTx4caHpn3k/R1V+v+KjkeN+6eV1np3b9sj3y2vc7Hv4hUNn3xrlX3vpCmTnQyz8RrU65jlYeITYN7ek/dSWPLhsSAAA=",
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      "X-EBAY-C-ENDUSERCTX": "deviceId=d295bd4e-156b-448d-8764-c87ebdfe7ba2",
      "Content-Type": "application/json",
    };

    const response = await axios.get(
      `https://apix.sandbox.ebay.com/buy/order/v2/guest_checkout_session/${checkoutSessionId}`,
      { headers }
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "Error fetching guest checkout session:",
      error.response?.data || error.message
    );
    res.status(error.response?.status || 500).json({
      error: error.response?.data || "Internal Server Error",
    });
  }
});

module.exports = router;
