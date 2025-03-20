require("dotenv").config();
const axios = require("axios");
const { getValidAccessToken } = require("../tools/ebayAuth");

async function registerWebhook() {
  const token = await getValidAccessToken(); // Implement this based on eBay's OAuth flow

  const response = await axios.post(
    "https://api.ebay.com/commerce/notification/v1/destination",
    {
      url: "https://66ac-103-148-179-215.ngrok-free.app/webhook/ebay",
      name: "My Webhook",
      eventTypes: ["ITEM_SOLD", "ITEM_CREATED"],
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  console.log("Webhook registered:", response.data);
}

registerWebhook();
