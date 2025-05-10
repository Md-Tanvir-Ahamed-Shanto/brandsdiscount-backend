// lib/woocommerce.js
const axios = require("axios");

const consumerKey = process.env.WC_CONSUMER_KEY;
const consumerSecret = process.env.WC_CONSUMER_SECRET;
const storeUrl = process.env.WC_STORE_URL;

const wooAPI = axios.create({
  baseURL: `${storeUrl}/wp-json/wc/v3`,
  auth: {
    username: consumerKey,
    password: consumerSecret,
  },
});

async function woocommerceItemUpdate(sku, updateData) {
  const product = await wooAPI.get("/products", {
    params: { sku },
  });
  const response = await wooAPI.put(
    `/products/${product.data[0].id}`,
    updateData
  );
  return response.data;
}

module.exports = {
  woocommerceItemUpdate,
};
