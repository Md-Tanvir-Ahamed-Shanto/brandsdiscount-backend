const axios = require("axios");
const { getValidAccessToken2 } = require("../tools/ebayAuth2");

async function listFulfillmentPolicies() {
  const token = await getValidAccessToken2();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  try {
    const response = await axios.get(
      "https://api.ebay.com/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US",
      { headers }
    );
    console.log("Fulfillment policies for EBAY_US:", response.data);
  } catch (error) {
    console.error("Error fetching fulfillment policies:", error.response?.data || error.message);
  }
}

listFulfillmentPolicies();
