const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { verifyUser } = require("../tools/authenticate");
const { ensureRoleAdmin } = require("../tools/tools.js");

const axios = require("axios");

const ebayAuth = require("../tools/ebayAuth.js");

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

  const createFulfillmentPolicy = async (token) => {
    try {
      const response = await axios.post(
        `https://api.sandbox.ebay.com/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US`,
        {
          // Provide the body data for creating the fulfillment policy
          name: "Standard Shipping Policy", // Name of your policy
          shipping: {
            shippingService: "USPS_PRIORITY_MAIL", // Example shipping service
            cost: {
              currency: "USD",
              value: 5.0, // Shipping cost (if applicable)
            },
          },
          returnAccepted: true, // Set whether returns are accepted
          shippingDuration: "CALENDAR_DAY_1", // Shipping duration (1 day)
        },
        {
          headers: {
            Authorization: `Bearer ${token}`, // Ensure you pass the token here
            "Content-Type": "application/json", // Set content type
          },
        }
      );

      // Get the fulfillment policy ID from the response
      const fulfillmentPolicyId = response.data.fulfillmentPolicyId;
      console.log("Fulfillment Policy Created:", fulfillmentPolicyId);

      return fulfillmentPolicyId; // You can use this ID for your listings
    } catch (error) {
      console.error(
        "Error creating fulfillment policy:",
        error.response?.data || error.message
      );
      throw new Error("Failed to create fulfillment policy.");
    }
  };

  // Function to get eBay inventory items with pagination support (limit and offset)
  const getInventoryItems = async (token, limit = 10, offset = 0) => {
    try {
      const response = await axios.get(
        `https://api.sandbox.ebay.com/sell/inventory/v1/inventory_item`,
        {
          params: {
            limit: limit, // Optional: number of items to fetch per request (default is 10)
            offset: offset, // Optional: the number of items to skip for pagination (default is 0)
          },
          headers: {
            Authorization: `Bearer ${token}`, // Provide your access token
            "Content-Type": "application/json", // Set the content type
          },
        }
      );

      // Handle the response data
      console.log("Inventory Items:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Error fetching inventory items:",
        error.response?.data || error.message
      );
      throw new Error("Failed to fetch inventory items");
    }
  };

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
            Brand: ["Generic"], // Modify according to your product's aspects
          },
          imageUrls: ["https://via.placeholder.com/300"], // Replace with actual image URL if available
          ean: ["1234567890123"], // Replace with product's EAN if available
          mpn: "MPN123456", // Replace with product's MPN if available
          upc: ["123456789012"], // Replace with product's UPC if available
        },
        // Availability details
        availability: {
          shipToLocationAvailability: {
            quantity: quantity, // Quantity available for shipping
          },
          pickupAtLocationAvailability: [
            {
              availabilityType: "IN_STOCK", // Modify availability type as needed
              fulfillmentTime: {
                unit: "DAY", // Modify unit if needed (e.g., BUSINESS_DAY, CALENDAR_DAY)
                value: 1, // Modify fulfillment time (e.g., 1 day)
              },
              merchantLocationKey: "merchantLocationKey123", // Add merchant location key if needed
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
          packageType: "MAILING_BOX", // Modify package type as needed
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

    createFulfillmentPolicy(token);

    // Step 2.2: Create Offer for Listing
    // const offerResponse = await axios.post(
    //   `${EBAY_SANDBOX_URL}/sell/inventory/v1/offer`,
    //   {
    //     sku: sku,
    //     marketplaceId: "EBAY_US",
    //     format: "FIXED_PRICE",
    //     listingDuration: "GTC",
    // listingPolicies: {
    //   paymentPolicyId: "YOUR_PAYMENT_POLICY_ID",
    //   returnPolicyId: "YOUR_RETURN_POLICY_ID",
    //   //   fulfillmentPolicyId: "YOUR_FULFILLMENT_POLICY_ID",
    // },
    //     pricingSummary: {
    //       price: {
    //         currency: "USD",
    //         value: price,
    //       },
    //     },
    //   },
    //   {
    //     headers: {
    //       Authorization: `Bearer ${token}`,
    //       "Content-Type": "application/json",
    //       "Content-Language": "en-US",
    //     },
    //   }
    // );

    // const offerId = offerResponse.data.offerId;

    // console.log("offerId");
    // console.log(offerId);
    const inventoryData = await getInventoryItems(token);
    console.log("inventoryData");
    console.log(inventoryData);

    // Step 2.3: Publish the Listing
    // await axios.post(
    //   `${EBAY_SANDBOX_URL}/sell/inventory/v1/offer/${offerId}/publish`,
    //   {},
    //   {
    //     headers: {
    //       Authorization: `Bearer ${token}`,
    //       "Content-Type": "application/json",
    //       "Content-Language": "en-US",
    //     },
    //   }
    // );

    res.json({ success: true, message: "Product created successfully" });
  } catch (error) {
    console.error(
      "Error creating eBay product:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to create product on eBay" });
  }
});

module.exports = router;
