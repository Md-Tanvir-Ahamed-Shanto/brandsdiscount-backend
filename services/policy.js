const axios = require("axios");
const { getValidAccessToken2 } = require("../tools/ebayAuth2");

async function listPaymentPolicies() {
  const token = await getValidAccessToken2(); // your OAuth token
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  try {
    const response = await axios.get(
      "https://api.ebay.com/sell/account/v1/payment_policy?marketplace_id=EBAY_US",
      { headers }
    );
    console.log("Payment policies for EBAY_US:", response.data);
  } catch (error) {
    console.error("Error fetching payment policies:", error.response?.data || error.message);
  }
}

listPaymentPolicies();
