const axios = require("axios");
const { getValidAccessToken2 } = require("../tools/ebayAuth2");
const { getValidAccessToken3 } = require("../tools/ebayAuth3");

async function getReturnPolicy(policyId) {
  const token = await getValidAccessToken2(); // your function to get eBay OAuth token
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  try {
    const response = await axios.get(
      `https://api.ebay.com/sell/account/v1/return_policy/${policyId}`,
      { headers }
    );
    console.log("Return Policy Details:", response.data);
  } catch (error) {
    console.error("Error fetching return policy:", error.response?.data || error.message);
  }
}

getReturnPolicy("253004185012");