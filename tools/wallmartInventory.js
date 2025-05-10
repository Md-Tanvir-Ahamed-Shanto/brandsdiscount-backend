const axios = require("axios");
const { getValidAccessToken } = require("./wallmartAuth");

async function walmartItemUpdate(sku, quantity) {
  const updateData = {
    quantity: {
      unit: "EACH",
      amount: quantity,
    },
  };
  const token = await getValidAccessToken();
  try {
    const url = `https://marketplace.walmartapis.com/v3/inventory?sku=${sku}`;
    const headers = {
      "WM_QOS.CORRELATION_ID": "790554c7-caaa-4f2d-ada6-572b3b7fca88",
      "WM_SEC.ACCESS_TOKEN": token, // Replace with actual token
      "WM_SVC.NAME": "Walmart Marketplace",
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const response = await axios.put(url, updateData, { headers });
    return response.data;
  } catch (error) {
    console.error(
      "Walmart Inventory Update Error:",
      error.response?.data || error.message
    );
  }
}

module.exports = {
  walmartItemUpdate,
};
